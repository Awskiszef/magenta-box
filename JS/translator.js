(function($) {
    window.translator = {
        defaults: {
            languageEl: '#language_select',
            loadCallback: null,
            langValue:null,
        },
        cache: {
            currentVal: '',
            currentHref: '',
            message:{}
        },
    };
    $.extend(window.translator, {
        isInitialized: false,
        init: function(options) {
            var translator = this;
            if (this.isInitialized) {
                translator.translateDom();
                return;
            }
            this.isInitialized = true;
            translator.settings = $.extend(translator.defaults, options);
            var $languageEl = $(translator.settings.languageEl);
            if ($languageEl.length > 0) {
                if (translator.settings.langValue && translator.settings.langValue()) {
                    $languageEl.val(translator.settings.langValue());
                }
                $languageEl.click(function(event) {
                    translator.fetchLangFile();
                }).trigger('click');
            }
        },
        fetchLangFile: function() {
            var that = this;
            var $languageEl = $(this.settings.languageEl);
            this.cache.currentVal = $languageEl.find('.selected').attr('data-value');
            var cacheKey = this.cache.currentVal + '_json';
            this.cache.currentHref = $(translator.settings.languageEl).find('[data-value^=' + this.cache.currentVal + ']').attr('href');

            if (this.cache.currentHref) {
                var cachedData = sessionStorage.getItem(cacheKey);
                if (cachedData) {
                    $(document).ready(() => {
                        that.cache.message[that.cache.currentVal] = JSON.parse(cachedData);
                        that.translateDom();
                    });
                } else {
                    $.getJSON(this.cache.currentHref, function(data) {
                        sessionStorage.setItem(cacheKey, JSON.stringify(data));
                        $(document).ready(() => {
                            that.cache.message[that.cache.currentVal] = data;
                            that.translateDom();
                        });
                    })
                    .fail(function(jqXHR, textStatus, errorThrown) {
                        if (textStatus === 'error' && (jqXHR.status === 0 || errorThrown === '')) {
                            if (!window.location.search.includes("cache")) {
                                window.location.href = window.location.pathname + "?cache=" + new Date().getTime(); //force to reload cache
                            }
                        } else {
                            $("#errorModal").modal('show');
                        }
                    });
                }
            }  
        },
        translateDom: function(selector) {
            var translator = this;
            var target = $(selector ? $(selector).parent() : document);
            if (translator.cache.message[translator.cache.currentVal]) {
                target.find("input[type=button],input[type=submit]").filter("[data-label]").each(function() {
                    var $this = $(this);
                    $this.val(translator.maybeFormat($this));
                });
                target.find("title,label,option,a,span,h1,h2,div,h3,h4,h6,td,th,b,button,strong,li,p,dt").filter("[data-label]").each(function() {
                    var $this = $(this);
                    $this.html(translator.maybeFormat($this));
                    $this.trigger("chosen:updated");
                });
                target.find('input').filter("[data-placeholder]").each(function() {
                    var $this = $(this);
                    $this.prop('placeholder',translator.getTranslateVal($this.data('placeholder')));
                });
                target.find('[data-alt]').each(function() {
                    var $this = $(this);
                    $this.attr('alt', translator.getTranslateVal($this.data('alt')));
                });
                target.find('[data-aria="true"]').filter('span, div, label, h2, h4, h6').each(function () {
                    var $this = $(this);
                    var textVal = $.trim($this.text());
                    if (textVal) {
                        $this.attr('aria-label', textVal);
                    }
                });
            }
        },
        getTranslateVal: function(key) {
            return this.cache.message[this.cache.currentVal] && this.cache.message[this.cache.currentVal][key] ? this.cache.message[this.cache.currentVal][key] : key;
        },
        maybeFormat: function($el){
            var labelStr = translator.getTranslateVal($el.data("label")).toString();
            if ($el.data('format')) {
                var formatStrArr = $el.data('format').toString().split(',');
                return  String.prototype.format.apply(labelStr,formatStrArr.map(function(el) {
                    return translator.getTranslateVal(el);
                }));
            }else{
                return labelStr.replace(/\{\d*\}/g, '');
            }
        }
    });
})(jQuery);