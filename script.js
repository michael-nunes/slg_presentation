const $ = document.querySelector.bind(document);
const $$ =  document.createElement.bind(document);


const BlackPage = function() {
    this.render = function() {
        this.dom = $$("div");
        this.dom.className = 'cover-page';
        this.dom.style['background'] = '#000';
        return this.dom;
    }
}

const CoverPage = function(data) {
    var  { title, author } = data;
    this.author = author ?? 'Author';
    this.title  = title ?? 'Songs Title';
    this.render = function() {
        const page = document.createElement('div');
        const title = document.createElement('h1');
        title.innerText = this.title;
        title.className =  'cover-title';
        const author = document.createElement('h3');
        author.innerText = this.author;
        author.className = 'cover-author';
        page.className = 'cover-page column column-center';
        page.appendChild(title);
        page.appendChild(author);
        return page;
    }
}

const SlideLine = function(text) {
    this.text = text;
    this.dom = null;
    this.render = function() {
        this.dom = $$('p');
        this.dom.className = 'slide-line';
        this.dom.innerText = this.text;
        return this.dom;
    }
}

const SlidePage = function(data) {
    const { lines } = data;
    this.lines = [];
    lines.forEach(element => {
        this.lines.push(new SlideLine(element));
    });
    this.dom = null;
    this.render = function() {
        if (this.dom != null) return this.dom;
        this.dom = $$('div');
        this.dom.className =   'cover-page column column-center';
        this.lines.forEach(e => {
            this.dom.appendChild(e.render());
        });
        return this.dom;
    }
}


const Presentation = function(){
    this.pages = [];
    this.index = 0;
    this.add = function(page) {
        this.pages.push(page);
    }
    this.onCurrentChange = null;
    this.getCurrent = function() {
        return this.pages[this.index].render();
    }

    const raiseOnCurrentChanged = (function(oldIndex, newIndex) {
        console.log("Change Index", oldIndex, newIndex);
        if (this.onCurrentChange != null) this.onCurrentChange();
    }).bind(this);

    this.goTo = function(pageIndex) {
        var newIndex = Math.max(0,Math.min(this.pages.length-1, pageIndex));
        if (newIndex != this.index){
            var old = this.index;
            this.index = newIndex;
            raiseOnCurrentChanged(old, newIndex);
        }


    }

    this.nextSlide = function() {
        if (this.index < this.pages.length-1) {
            this.index++;
            raiseOnCurrentChanged(this.index-1, this.index);
        }
    }

    this.previousSlide = function() {
        if(this.index > 0) {
            this.index--;
            raiseOnCurrentChanged(this.index+1, this.index);
        }
    }
}

const ColorTheme = function(data) {
    var {background, foreground } = data;
    this.background = background ?? 'white';
    this.foreground = foreground ?? 'black';
    this.apply = function(el) {
        el.style['background'] = this.background;
        el.style['color'] = this.foreground;
    }
}

document.addEventListener('DOMContentLoaded', function(e){


    var themeIndex = 0;
    var themes = [
        new ColorTheme({foreground:'black', background: 'white'}),
        new ColorTheme({foreground:'white', background: 'black'}),
        new ColorTheme({foreground:'yellow', background: 'blue'}),
    ];

    var slide = new Presentation();

    window.slide = slide;

   // slide.add(new CoverPage({title:"Harpa 204", author:"Harpa"}));
    slide.add(new BlackPage());

    const keyTable = {
        'ArrowLeft' :()=> slide.previousSlide(),
        'ArrowRight' :()=> slide.nextSlide(),
        'KeyV': ()=> {
            themes[(++themeIndex)%themes.length].apply($("#display_view_container"));
        }
    };

    document.addEventListener('keydown', function(e){
        console.log(e);
        (keyTable[e.code] ?? function(){})();
    }, false);

    $("#display_view").appendChild($$('div'));

    const renderPageIndicator = function() {
        $("#page_indicator").innerText = `Pagina ${slide.index+1} de ${slide.pages.length}`;
    }

    window.detectOverflow = function() {
        var vertical = $("#display_view_container").clientHeight < $("#display_view").scrollHeight;
        var horizontal = $("#display_view_container").clientWidth < $("#display_view").scrollWidth;
        return vertical || horizontal;
    }

    const renderPage = function() {
        document.location.hash = `#page=${slide.index}`;
        renderPageIndicator();
        $("#display_view").firstChild.remove();
        $("#display_view").appendChild(slide.getCurrent());
        
        var size = 52;
        const bodyEl = $("#display_view_container");
        bodyEl.style['font-size'] = '1.6em';
        while(detectOverflow()) {
            size--;
            bodyEl.style['font-size'] = `${size}px`;
        }
       
    }

    slide.onCurrentChange = function() {
        renderPage();
    }
    
    if (document.location.hash != '') {
        var hashPage = document.location.hash.substring(document.location.hash.indexOf('=')+1);
        slide.goTo(Number.parseInt(hashPage));
    }

    renderPage();


  


    //var area = document.getElementById("slg_source");

    document.querySelector("#file-input").addEventListener('change', function(e){
        var file = e.target.files[0];
        if (file == null) return;
        var reader = new FileReader();
        reader.onload = function(e){

            slide.pages = [];
            slide.index = 0;

           // area.value = e.target.result;

            var stream = e.target.result.split(/[\n]/);
            var title = undefined;
            var author = undefined;
            const STATE_TITLE = 1;
            const STATE_AUTHOR = 2;
            const STATE_SLIDE = 3;
            const STATE_SLIDE_LINE = 4;
            const STATE_SEEK = 0;

            var lines = [];
            var state = STATE_SEEK;


            const flushLines = () => {
                if (lines.length > 0) {
                    slide.add(new SlidePage({
                        lines: lines
                    }));
                    lines = [];
                }
            }

            stream.forEach(function(value){
                switch(state) {
                    case STATE_SEEK:
                        if (value.trim() == '[AUTHOR]') state = STATE_AUTHOR;
                        if (value.trim() == '[TITLE]') state  = STATE_TITLE;
                        if (value.trim() == '[SLIDE]') state = STATE_SLIDE;
                        break;
                    case STATE_AUTHOR:
                        author = value;
                        state = STATE_SEEK;
                        break
                    case STATE_TITLE:
                        title = value;
                        state = STATE_SEEK;
                        break;
                    case STATE_SLIDE:
                        console.log(title,author);
                        slide.add(new CoverPage({
                            title: title,
                            author: author
                        }));
                        state = STATE_SLIDE_LINE;
                    case STATE_SLIDE_LINE:
                        if(value.trim() == '') {
                            flushLines();
                        } else if(value[0] == '[' && value.trim() == '[NEW_SLIDE]') {
                            flushLines();
                            slide.add(new BlackPage());
                            state = STATE_SEEK;
                        } else {
                            lines.push(value);
                        }
                        break;
                }
            });
            flushLines();

            slide.add(new BlackPage());

            renderPage();
            renderPageIndicator();
        }
        reader.readAsText(file);
    }, false);

    //$("#display_view").appendChild(slide.getCurrent());
    
},false);





