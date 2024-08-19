package controllers

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

type WsMarkDown struct {
	MarkDown   string
	Conns      []*websocket.Conn
	Name       string
	DocId      int
	Lock       *sync.Mutex
	ModifyTime time.Time
}

type Diff struct {
	Count int    `json:"count"`
	Type  uint8  `json:"type"`
	Value string `json:"value"`
}

type OptMarkDown struct {
	MarkDown string  `json:"mark_down"`
	Diffs    []*Diff `json:"diffs"`
	Name     string  `json:"name"`
	DocId    int     `json:"doc_id"`
	Opt      int     `json:"opt"`
	RandomId int     `json:"random_id"`
}

var MemoryMarkDownMap map[int]*WsMarkDown

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	//CheckOrigin: func(r *http.Request) bool {
	//	return r.Header.Get("Origin") == ""
	//},
}

func init() {
	MemoryMarkDownMap = map[int]*WsMarkDown{}
}

type WebSocketController struct {
	BaseController
}

// Index method handles WebSocket requests for WebSocketController.
func (c *WebSocketController) Index() {
	DocName := c.GetString("DocName")
	DocId, err := c.GetInt("DocId")
	if err != nil {
		return
	}
	//md := this.GetString("MarkDown")

	if len(DocName) == 0 || DocId <= 0 {
		c.Redirect("/", 302)
		return
	}

	// Upgrade from http request to WebSocket.
	ws, err := upgrader.Upgrade(c.Ctx.ResponseWriter, c.Ctx.Request, nil)
	if err != nil {
		return
	}

	if mdDoc, ok := MemoryMarkDownMap[DocId]; ok {
		mdDoc.Conns = append(mdDoc.Conns, ws)
	} else {
		wsMD := WsMarkDown{}
		wsMD.Name = DocName
		wsMD.Conns = append(wsMD.Conns, ws)
		wsMD.DocId = DocId
		wsMD.Lock = &sync.Mutex{}
		wsMD.MarkDown = ""
		wsMD.ModifyTime = time.Now()
		MemoryMarkDownMap[DocId] = &wsMD
	}
	for {
		_, p, err := ws.ReadMessage()
		if err != nil {
			println(err.Error())
			return
		}
		optMD := OptMarkDown{}
		err = json.Unmarshal(p, &optMD)
		if err == nil {
			if optMD.Opt == 0 {
				break
			}
			go handlerMD(DocId, optMD)
		} else {
			println(err.Error())
		}
	}
}

func handlerMD(DocId int, optMD OptMarkDown) {
	if optMD.Opt == 1 {
		if mdDoc, ok := MemoryMarkDownMap[DocId]; ok {
			mdDoc.Lock.Lock()
			defer mdDoc.Lock.Unlock()
			mdDoc.Name = optMD.Name
			if len(optMD.Diffs) > 0 {
				isDiff := false
				builder := &strings.Builder{}
				count := int(0)

				for _, d := range optMD.Diffs {
					if d.Type == 0 {
						if (count + d.Count) <= utf8.RuneCountInString(mdDoc.MarkDown) {
							runeMd := []rune(mdDoc.MarkDown)
							builder.WriteString(string(runeMd[count : count+d.Count]))
							count += d.Count
						} else {
							return
						}
					} else if d.Type == 1 {
						builder.WriteString(d.Value)
					} else if d.Type == 2 {
						count += d.Count
					}
					if d.Type > 0 {
						isDiff = true
					}
				}
				if isDiff {
					mdDoc.MarkDown = builder.String()
					mdDoc.ModifyTime = time.Now()
					MemoryMarkDownMap[DocId] = mdDoc
					broadcastWebSocket(DocId, optMD)
				}
			}
		}
	}
}

// broadcastWebSocket broadcasts messages to WebSocket users.
func broadcastWebSocket(DocId int, event OptMarkDown) {
	data, err := json.Marshal(&event)
	if err == nil {
		for _, v := range MemoryMarkDownMap[DocId].Conns {
			err = v.WriteMessage(websocket.TextMessage, data)
			if err != nil {
				continue
			}
		}
	}
}
