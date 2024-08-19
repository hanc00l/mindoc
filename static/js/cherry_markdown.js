$(function () {

    window.editormdLocales = {
        'zh-CN': {
            placeholder: '本编辑器支持 Markdown 编辑，左边编写，右边预览。',
            contentUnsaved: '编辑内容未保存，需要保存吗？',
            noDocNeedPublish: '没有需要发布的文档',
            loadDocFailed: '文档加载失败',
            fetchDocFailed: '获取当前文档信息失败',
            cannotAddToEmptyNode: '空节点不能添加内容',
            overrideModified: '文档已被其他人修改确定覆盖已存在的文档吗？',
            confirm: '确定',
            cancel: '取消',
            contentsNameEmpty: '目录名称不能为空',
            addDoc: '添加文档',
            edit: '编辑',
            delete: '删除',
            loadFailed: '加载失败请重试',
            tplNameEmpty: '模板名称不能为空',
            tplContentEmpty: '模板内容不能为空',
            saveSucc: '保存成功',
            serverExcept: '服务器异常',
            paramName: '参数名称',
            paramType: '参数类型',
            example: '示例值',
            remark: '备注',
        },
        'en': {
            placeholder: 'This editor supports Markdown editing, writing on the left and previewing on the right.',
            contentUnsaved: 'The edited content is not saved, need to save it?',
            noDocNeedPublish: 'No Document need to be publish',
            loadDocFailed: 'Load Document failed',
            fetchDocFailed: 'Fetch Document info failed',
            cannotAddToEmptyNode: 'Cannot add content to empty node',
            overrideModified: 'The document has been modified by someone else, are you sure to overwrite the document?',
            confirm: 'Confirm',
            cancel: 'Cancel',
            contentsNameEmpty: 'Document Name cannot be empty',
            addDoc: 'Add Document',
            edit: 'Edit',
            delete: 'Delete',
            loadFailed: 'Failed to load, please try again',
            tplNameEmpty: 'Template name cannot be empty',
            tplContentEmpty: 'Template content cannot be empty',
            saveSucc: 'Save success',
            serverExcept: 'Server Exception',
            paramName: 'Parameter',
            paramType: 'Type',
            example: 'Example',
            remark: 'Remark',
        }
    };

    var CustomHookA = Cherry.createSyntaxHook('codeBlock', Cherry.constants.HOOKS_TYPE_LIST.PAR, {
        makeHtml(str) {
            console.warn('custom hook', 'hello');
            return str;
        },
        rule(str) {
            const regex = {
                begin: '',
                content: '',
                end: '',
            };
            regex.reg = new RegExp(regex.begin + regex.content + regex.end, 'g');
            return regex;
        },
    });
    /**
     * 自定义一个自定义菜单
     * 点第一次时，把选中的文字变成同时加粗和斜体
     * 保持光标选区不变，点第二次时，把加粗斜体的文字变成普通文本
     */
    var customMenuA = Cherry.createMenuHook('加粗斜体', {
        iconName: 'font',
        onClick: function (selection) {
            // 获取用户选中的文字，调用getSelection方法后，如果用户没有选中任何文字，会尝试获取光标所在位置的单词或句子
            let $selection = this.getSelection(selection) || '同时加粗斜体';
            // 如果是单选，并且选中内容的开始结束内没有加粗语法，则扩大选中范围
            if (!this.isSelections && !/^\s*(\*\*\*)[\s\S]+(\1)/.test($selection)) {
                this.getMoreSelection('***', '***', () => {
                    const newSelection = this.editor.editor.getSelection();
                    const isBoldItalic = /^\s*(\*\*\*)[\s\S]+(\1)/.test(newSelection);
                    if (isBoldItalic) {
                        $selection = newSelection;
                    }
                    return isBoldItalic;
                });
            }
            // 如果选中的文本中已经有加粗语法了，则去掉加粗语法
            if (/^\s*(\*\*\*)[\s\S]+(\1)/.test($selection)) {
                return $selection.replace(/(^)(\s*)(\*\*\*)([^\n]+)(\3)(\s*)($)/gm, '$1$4$7');
            }
            /**
             * 注册缩小选区的规则
             *    注册后，插入“***TEXT***”，选中状态会变成“***【TEXT】***”
             *    如果不注册，插入后效果为：“【***TEXT***】”
             */
            this.registerAfterClickCb(() => {
                this.setLessSelection('***', '***');
            });
            return $selection.replace(/(^)([^\n]+)($)/gm, '$1***$2***$3');
        }
    });
    /**
     * 定义一个空壳，用于自行规划cherry已有工具栏的层级结构
     */
    var customMenuB = Cherry.createMenuHook('发布', {
        iconName: 'publish',
        onClick: releaseDocument,
    });

    var customMenuC = Cherry.createMenuHook("返回", {
        iconName: 'back',
        onClick: backWard,
    })

    var customMenuD = Cherry.createMenuHook('保存', {
        id: "markdown-save",
        iconName: 'save',
        onClick: saveDocument,
    });

    var customMenuE = Cherry.createMenuHook('边栏', {
        iconName: 'sider',
        onClick: siderChange,
    });

    var customMenuF = Cherry.createMenuHook('历史', {
        iconName: 'history',
        onClick: showHistory,
    });

    let customMenuTools =  Cherry.createMenuHook('工具',  {
        iconName: '',
        subMenuConfig: [
            {
                iconName: 'word',
                name: 'Word转笔记',
                onclick: ()=>{
                    let converter = new WordToHtmlConverter();
                    converter.handleFileSelect(function (response) {
                        if (response.messages.length) {
                            let messages = response.messages.map((item)=>{
                                return item.message + "<br/>";
                            }).join('\n');
                            layer.msg(messages);
                        }
                        converter.replaceHtmlBase64(response.value).then((html)=>{
                            window.editor.insertValue(html);
                        });
                    })
                }
            },
            {
                noIcon: true,
                name: 'Htm转Markdown',
                onclick: ()=>{
                    let converter = new HtmlToMarkdownConverter();
                    converter.handleFileSelect(function (response) {
                        window.editor.insertValue(response);
                    })
                }
            }
        ]
    });


    var basicConfig = {
        id: 'manualEditorContainer',
        externals: {
            echarts: window.echarts,
            katex: window.katex,
            MathJax: window.MathJax,
        },
        isPreviewOnly: false,
        fileUpload: myFileUpload,
        engine: {
            global: {
                urlProcessor(url, srcType) {
                    //console.log(`url-processor`, url, srcType);
                    return url;
                },
            },
            syntax: {
                codeBlock: {
                    theme: 'twilight',
                },
                table: {
                    enableChart: false,
                    // chartEngine: Engine Class
                },
                fontEmphasis: {
                    allowWhitespace: false, // 是否允许首尾空格
                },
                strikethrough: {
                    needWhitespace: false, // 是否必须有前后空格
                },
                mathBlock: {
                    engine: 'MathJax', // katex或MathJax
                    src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js', // 如果使用MathJax plugins，则需要使用该url通过script标签引入
                },
                inlineMath: {
                    engine: 'MathJax', // katex或MathJax
                },
                emoji: {
                    useUnicode: false,
                    customResourceURL: 'https://github.githubassets.com/images/icons/emoji/unicode/${code}.png?v8',
                    upperCase: true,
                },
                // toc: {
                //     tocStyle: 'nested'
                // }
                // 'header': {
                //   strict: false
                // }
            },
            customSyntax: {
                // SyntaxHookClass
                CustomHook: {
                    syntaxClass: CustomHookA,
                    force: false,
                    after: 'br',
                },
            },
        },
        toolbars: {
            toolbar: [
                'customMenuCName',
                'customMenuDName',
                'customMenuBName',
                'customMenuEName',
                'undo',
                'redo',
                'bold',
                'italic',
                {
                    strikethrough: ['strikethrough', 'underline', 'sub', 'sup', 'ruby', 'customMenuAName'],
                },
                'size',
                '|',
                'color',
                'header',
                '|',
                'drawIo',
                '|',
                'ol',
                'ul',
                'checklist',
                'panel',
                'detail',
                '|',
                'formula',
                {
                    insert: ['image', 'audio', 'video', 'link', 'hr', 'br', 'code', 'formula', 'toc', 'table', 'pdf', 'word', 'ruby'],
                },
                'graph',
                'togglePreview',
                'settings',
                'switchModel',
                'export',
                'customMenuFName',
                'customMenuToolsName'
            ],
            bubble: ['bold', 'italic', 'underline', 'strikethrough', 'sub', 'sup', 'quote', 'ruby', '|', 'size', 'color'], // array or false
            sidebar: ['mobilePreview', 'copy', 'codeTheme', 'theme'],
            customMenu: {
                customMenuAName: customMenuA,
                customMenuBName: customMenuB,
                customMenuCName: customMenuC,
                customMenuDName: customMenuD,
                customMenuEName: customMenuE,
                customMenuFName: customMenuF,
                customMenuToolsName: customMenuTools,
            },
        },
        drawioIframeUrl: '/static/cherry/drawio_demo.html',
        editor: {
            defaultModel: 'edit&preview',
            height: "100%",
        },
        previewer: {
            // 自定义markdown预览区域class
            // className: 'markdown'
        },
        keydown: [],
        //extensions: [],
        //callback: {
        //changeString2Pinyin: pinyin,
        //}
        callback: {
            afterChange: function () {
                if (window.mysocket != undefined && window.mysocket != null) {
                    if (window.editor.getMarkdown() != window.mysocket["LastUpdate"]) {
                        var index = layer.load(1, {
                            shade: [0.1, '#fff'] // 0.1 透明度的白色背景
                        });

                        var diffs = Diff['diffChars'](window.mysocket["LastChange"], window.editor.getMarkdown());
                        var is_change = false

                        var chageArr = [];

                        for (var i=0;i<diffs.length;i++){
                            if (diffs[i]["removed"] || diffs[i]["added"] ){
                                if (diffs[i]["added"]){
                                    chageArr.push({"count":diffs[i]["count"],"type":1,"value":diffs[i]["value"]})
                                }else if (diffs[i]["removed"]){
                                    chageArr.push({"count":diffs[i]["count"],"type":2,"value":diffs[i]["value"]})
                                }
                                is_change = true
                            }else{
                                chageArr.push({"count":diffs[i]["count"],"type":0,"value":""})
                            }
                        }
                        if (is_change){
                            console.log(chageArr)
                        }
                        if (window.mysocket["Socket"].readyState === 1) {
                            obj = {
                                "opt": 1,
                                "name": window.mysocket["DocName"],
                                "diffs":chageArr,
                                "doc_id": window.mysocket["doc_id"],
                                // "mark_down": window.editor.getMarkdown(),
                                "mark_down": "",
                                "random_id": window.mysocket["random_id"]
                            };
                            window.mysocket["Socket"].send(JSON.stringify(obj));
                            window.mysocket["LastChange"] = window.editor.getMarkdown();
                            window.mysocket["LastUpdate"] = window.editor.getMarkdown();
                        }

                        layer.close(index);

                        console.log("send message")

                    }
                }else{
                    console.log("???content copy")
                }
            },
            // afterInit: callbacks.afterInit,
            // beforeImageMounted: callbacks.beforeImageMounted,
            // // 预览区域点击事件，previewer.enablePreviewerBubble = true 时生效
            // onClickPreview: callbacks.onClickPreview,
            // // 复制代码块代码时的回调
            // onCopyCode: callbacks.onCopyCode,
            // // 把中文变成拼音的回调，当然也可以把中文变成英文、英文变成中文
            // changeString2Pinyin: callbacks.changeString2Pinyin,
        }
    };

    fetch('').then((response) => response.text()).then((value) => {
        //var markdownarea = document.getElementById("markdown_area").value
        var config = Object.assign({}, basicConfig);// { value: markdownarea });// { value: value });不显示获取的初始化值
        window.editor = new Cherry(config);
        window.editor.getCodeMirror().on('change', (e, detail)=>{
            resetEditorChanged(true);
        });
        openLastSelectedNode();
    });

    /***
     * 加载指定的文档到编辑器中
     * @param $node
     */
    window.loadDocument = function ($node) {
        var index = layer.load(1, {
            shade: [0.1, '#fff'] // 0.1 透明度的白色背景
        });

        $.get(window.editURL + $node.node.id).done(function (res) {
            layer.close(index);

            if (res.errcode === 0) {
                window.isLoad = true;
                try {
                    window.editor.setTheme(res.data.markdown_theme);
                    window.editor.setMarkdown(res.data.markdown);

                    RandomId = Math.round(Math.random() * 100000000);
                    protocol1='ws://'
                    if (document.location.protocol=="https:"){
                        protocol1='wss://'
                    }
                    socket = new WebSocket(protocol1 + window.location.host + '/ws/markdown?DocName=' + res.data.doc_name + '&DocId=' + res.data.doc_id + '&RandomId=' + RandomId);
                    if (window.mysocket!=undefined && window.mysocket!=null){
                        window.mysocket["Socket"].close()
                        window.mysocket = undefined;
                    }
                    window.mysocket = {
                        "DocName": res.data.doc_name,
                        "doc_id": res.data.doc_id,
                        "Socket": socket,
                        "random_id": RandomId,
                        "version_id": 1
                    }
                    window.mysocket["LastUpdate"] =window.editor.getMarkdown();
                    window.mysocket["LastChange"] =window.editor.getMarkdown();

                    // window.mysocket = socket;
                    socket.onmessage = function (event) {
                        var data = JSON.parse(event.data);
                        switch (data.opt) {
                            case 0:
                                break;
                            case 1:
                                if (data.random_id != window.mysocket["random_id"] && data.doc_id ==  window.mysocket["doc_id"] && data.diffs!=undefined && data.diffs!=null){
                                    // if (data.random_id != window.mysocket["random_id"] && data.doc_id ==  window.mysocket["doc_id"] && data.mark_down != window.editor.getMarkdown()  ) {

                                    // window.mysocket["LastUpdate"] = data.mark_down;
                                    var index = layer.load(1, {
                                        shade: [0.1, '#fff'] // 0.1 透明度的白色背景
                                    });

                                    if (data.diffs.length>0){
                                        var lastv = window.mysocket["LastChange"];
                                        var count = 0;
                                        var ct="";
                                        for (var i=0;i<data.diffs.length;i++){
                                            if (data.diffs[i]["type"]==0){
                                                ct+=lastv.slice(count,count+data.diffs[i]["count"]);
                                                count+=data.diffs[i]["count"];
                                            }else if (data.diffs[i]["type"]==1){
                                                ct+=data.diffs[i]["value"];
                                            }else if (data.diffs[i]["type"]==2){
                                                count+=data.diffs[i]["count"];
                                            }
                                        }
                                        window.mysocket["LastChange"] = ct;
                                        window.editor.setMarkdown(ct, keepCursor = true);
                                        window.mysocket["version_id"]++;
                                        layer.close(index);
                                        ct="";
                                    }


                                    // window.editor.setMarkdown(data.mark_down, keepCursor = true);
                                    // window.mysocket["version_id"]++
                                    // layer.close(index);
                                }

                                // console.log(event.data)
                                break;
                            default:

                        }
                    }
                } catch (e) {
                    console.log(e);
                }
                var node = { "id": res.data.doc_id, 'parent': res.data.parent_id === 0 ? '#' : res.data.parent_id, "text": res.data.doc_name, "identify": res.data.identify, "version": res.data.version };
                pushDocumentCategory(node);
                window.selectNode = node;
                pushVueLists(res.data.attach);
                setLastSelectNode($node);
            } else {
                layer.msg(editormdLocales[lang].loadDocFailed);
            }
        }).fail(function () {
            layer.close(index);
            layer.msg(editormdLocales[lang].loadDocFailed);
        });
    };

    /**
     * 保存文档到服务器
     * @param $is_cover 是否强制覆盖
     */
    function saveDocument($is_cover, callback) {
        var index = null;
        var node = window.selectNode;
        var content = window.editor.getMarkdown();
        var html = window.editor.getHtml(true);
        var markdownTheme = window.editor.getTheme();
        var version = "";

        if (!node) {
            layer.msg(editormdLocales[lang].fetchDocFailed);
            return;
        }
        if (node.a_attr && node.a_attr.disabled) {
            layer.msg(editormdLocales[lang].cannotAddToEmptyNode);
            return;
        }

        var doc_id = parseInt(node.id);

        for (var i in window.documentCategory) {
            var item = window.documentCategory[i];

            if (item.id === doc_id) {
                version = item.version;
                break;
            }
        }
        $.ajax({
            beforeSend: function () {
                index = layer.load(1, { shade: [0.1, '#fff'] });
                window.saveing = true;
            },
            url: window.editURL,
            data: { "identify": window.book.identify, "doc_id": doc_id, "markdown": content, "html": html, "markdown_theme": markdownTheme, "cover": $is_cover ? "yes" : "no", "version": version },
            type: "post",
            timeout: 30000,
            dataType: "json",
            success: function (res) {
                if (res.errcode === 0) {
                    resetEditorChanged(false);
                    for (var i in window.documentCategory) {
                        var item = window.documentCategory[i];

                        if (item.id === doc_id) {
                            window.documentCategory[i].version = res.data.version;
                            break;
                        }
                    }
                    $.each(window.documentCategory, function (i, item) {
                        var $item = window.documentCategory[i];

                        if (item.id === doc_id) {
                            window.documentCategory[i].version = res.data.version;
                        }
                    });
                    if (typeof callback === "function") {
                        callback();
                    }

                } else if (res.errcode === 6005) {
                    var confirmIndex = layer.confirm(editormdLocales[lang].overrideModified, {
                        btn: [editormdLocales[lang].confirm, editormdLocales[lang].cancel] // 按钮
                    }, function () {
                        layer.close(confirmIndex);
                        saveDocument(true, callback);
                    });
                } else {
                    layer.msg(res.message);
                }
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                layer.msg(window.editormdLocales[window.lang].serverExcept + errorThrown);
            },
            complete: function () {
                layer.close(index);
                window.saveing = false;
            }
        });
    }


    /**
     * 设置编辑器变更状态
     * @param $is_change
     */
    function resetEditorChanged($is_change) {
        if ($is_change && !window.isLoad) {
            $("#markdown-save").removeClass('disabled').addClass('change');
        } else {
            $("#markdown-save").removeClass('change').addClass('disabled');
        }
        window.isLoad = false;
    }

    /**
     * 返回上一个页面
     */
    function backWard() {
        if (document.referrer == "") { // 没有上一级
            var homepage = window.location.origin;
            window.location.href = homepage; // 返回首页
            return;
        }
        window.location.href = document.referrer;
    }

    /**
     * 发布文档
     */

    function releaseDocument() {
        if (Object.prototype.toString.call(window.documentCategory) === '[object Array]' && window.documentCategory.length > 0) {
            if ($("#markdown-save").hasClass('change')) {
                var confirm_result = confirm(editormdLocales[lang].contentUnsaved);
                if (confirm_result) {
                    saveDocument(false, releaseBook);
                    return;
                }
            }
            releaseBook();
            return
        }
        layer.msg(editormdLocales[lang].noDocNeedPublish)
    }


    /**
     * 显示/隐藏边栏
     */

    function siderChange() {
        $("#manualCategory").toggle(0, "swing", function () {
            var $then = $("#manualEditorContainer");
            var left = parseInt($then.css("left"));
            if (left > 0) {
                window.editorContainerLeft = left;
                $then.css("left", "0");
            } else {
                $then.css("left", window.editorContainerLeft + "px");
            }
        });
    }

    /**
     * 显示文档历史
     */

    function showHistory() {
        window.documentHistory();
    }

    /**
     * 添加文档
     */
    $("#addDocumentForm").ajaxForm({
        beforeSubmit: function () {
            var doc_name = $.trim($("#documentName").val());
            if (doc_name === "") {
                return showError(editormdLocales[lang].contentsNameEmpty, "#add-error-message")
            }
            $("#btnSaveDocument").button("loading");
            return true;
        },
        success: function (res) {
            if (res.errcode === 0) {
                var data = {
                    "id": res.data.doc_id,
                    'parent': res.data.parent_id === 0 ? '#' : res.data.parent_id,
                    "text": res.data.doc_name,
                    "identify": res.data.identify,
                    "version": res.data.version,
                    state: { opened: res.data.is_open == 1 },
                    a_attr: { is_open: res.data.is_open == 1 }
                };

                var node = window.treeCatalog.get_node(data.id);
                if (node) {
                    window.treeCatalog.rename_node({ "id": data.id }, data.text);
                    $("#sidebar").jstree(true).get_node(data.id).a_attr.is_open = data.state.opened;
                } else {
                    window.treeCatalog.create_node(data.parent, data);
                    window.treeCatalog.deselect_all();
                    window.treeCatalog.select_node(data);
                }
                pushDocumentCategory(data);
                $("#markdown-save").removeClass('change').addClass('disabled');
                $("#addDocumentModal").modal('hide');
            } else {
                showError(res.message, "#add-error-message");
            }
            $("#btnSaveDocument").button("reset");
        }
    });

    /**
     * 文档目录树
     */
    $("#sidebar").jstree({
        'plugins': ["wholerow", "types", 'dnd', 'contextmenu'],
        "types": {
            "default": {
                "icon": false  // 删除默认图标
            }
        },
        'core': {
            'worker':true,
            'check_callback': true,
            "multiple": false,
            'animation': 0,
            "data": window.documentCategory
        },
        "contextmenu": {
            show_at_node: false,
            select_node: false,
            "items": {
                "添加文档": {
                    "separator_before": false,
                    "separator_after": true,
                    "_disabled": false,
                    "label": window.editormdLocales[window.lang].addDoc,//"添加文档",
                    "icon": "fa fa-plus",
                    "action": function (data) {
                        var inst = $.jstree.reference(data.reference),
                            node = inst.get_node(data.reference);

                        openCreateCatalogDialog(node);
                    }
                },
                "编辑": {
                    "separator_before": false,
                    "separator_after": true,
                    "_disabled": false,
                    "label": window.editormdLocales[window.lang].edit,
                    "icon": "fa fa-edit",
                    "action": function (data) {
                        var inst = $.jstree.reference(data.reference);
                        var node = inst.get_node(data.reference);
                        openEditCatalogDialog(node);
                    }
                },
                "删除": {
                    "separator_before": false,
                    "separator_after": true,
                    "_disabled": false,
                    "label": window.editormdLocales[window.lang].delete,
                    "icon": "fa fa-trash-o",
                    "action": function (data) {
                        var inst = $.jstree.reference(data.reference);
                        var node = inst.get_node(data.reference);
                        openDeleteDocumentDialog(node);
                    }
                }
            }
        }
    }).on("ready.jstree", function () {
        window.treeCatalog = $("#sidebar").jstree(true);

        //如果没有选中节点则选中默认节点
        // openLastSelectedNode();
    }).on('select_node.jstree', function (node, selected) {

        if ($("#markdown-save").hasClass('change')) {
            if (confirm(window.editormdLocales[window.lang].contentUnsaved)) {
                saveDocument(false, function () {
                    loadDocument(selected);
                });
                return true;
            }
        }
        //如果是空目录则直接出发展开下一级功能
        if (selected.node.a_attr && selected.node.a_attr.disabled) {
            selected.instance.toggle_node(selected.node);
            return false
        }


        loadDocument(selected);
    }).on("move_node.jstree", jstree_save).on("delete_node.jstree", function ($node, $parent) {
        openLastSelectedNode();
    });
    /**
     * 打开文档模板
     */
    $("#documentTemplateModal").on("click", ".section>a[data-type]", function () {
        var $this = $(this).attr("data-type");
        if ($this === "customs") {
            $("#displayCustomsTemplateModal").modal("show");
            return;
        }
        var body = $("#template-" + $this).html();
        if (body) {
            window.isLoad = true;
            window.editor.clear();
            window.editor.insertValue(body);
            window.editor.setCursor({ line: 0, ch: 0 });
            resetEditorChanged(true);
        }
        $("#documentTemplateModal").modal('hide');
    });

    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            saveDocument(true, null);
        }
    });
});

function myFileUpload(file, callback) {
    // 创建 FormData 对象以便包含要上传的文件
    var formData = new FormData();
    formData.append("editormd-file-file", file); // "file" 是与你的服务端接口相对应的字段名
    var layerIndex = 0;
    // AJAX 请求
    $.ajax({
        url: window.fileUploadURL, // 确保此 URL 是文件上传 API 的正确 URL
        type: "POST",
        async: false, // 3xxx 20240609这里修改为同步，保证cherry批量上传图片时，插入的图片名称是正确的，否则，插入的图片名称都是最后一个名称
        dataType: "json",
        data: formData,
        processData: false, // 必须设置为 false，因为数据是 FormData 对象，不需要对数据进行序列化处理
        contentType: false, // 必须设置为 false，因为是 FormData 对象，jQuery 将不会设置内容类型头
        
        beforeSend: function () {
            layerIndex = layer.load(1, {
                shade: [0.1, '#fff'] // 0.1 透明度的白色背景
            });
        },
        
        error: function () {
            layer.close(layerIndex);
            layer.msg(locales[lang].uploadFailed);
        },
        success: function (data) {
            layer.close(layerIndex);
            // 验证data是否为数组
            if (data.errcode !== 0) {
                layer.msg(data.message);
            } else {
                callback(data.url); // 假设返回的 JSON 中包含上传文件的 URL，调用回调函数并传入 URL
            }
        }
    });
}