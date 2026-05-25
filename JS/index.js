$(function(){

    $.ajax({
        type: "GET",
        url: "api/getRouterStatus",
        dataType : "json",
        success: function(response){
            var language = localStorage.getItem("selectedLang");
            $("#loadingIcon").remove();
            if (partnerIdCheck("gr", response.partner_id)) {
                if (language == null || language !== "en_gr") {
                    language = 'gr';
                    document.documentElement.lang = "el";
                }
                $('body').addClass("greece");
                $("#common_header").remove();
                $("#gr_header").show();
                $("#greece_telephone").show();
                updateDropdownToggle(language);
            }else if (partnerIdCheck("hu",response.partner_id)) {
                language = 'en';
                response.partner_id = 'telekom-pl';
                document.title = "Home Box";
                updateDropdownToggle(language);
                $('.language_en_hr,.language_en_cz,.language_cz,.language_pl,.language_hu,.language_hr,.language_sk,.language_en_sk,.language_en_me,.language_me,.language_en_mk,.language_mk,.language_alb').hide();
            }else if(partnerIdCheck("cz",response.partner_id)){
                if (language == null || language !== "en_cz") {
                      language = 'cz';
                      document.documentElement.lang = "cz";
                }
                document.title = "wifi.router";
                updateDropdownToggle(language);
                $('.language_en_hr,.language_en_pl,.language_pl,.language_hu,.language_hr,.language_sk,.language_en_sk,.language_en_me,.language_me,.language_en_mk,.language_mk,.language_alb').hide();
            }else if(partnerIdCheck("pl",response.partner_id)){
                if (language == null || language !== "en_pl") {
                      language = 'pl';
                      document.documentElement.lang = "pl";
                }
                document.title = "Home Box";
                updateDropdownToggle(language);
                $('.language_en_cz,.language_cz,.language_hu,.language_hr,.language_en_hr,.language_sk,.language_en_sk,.language_en_me,.language_me,.language_en_mk,.language_mk,.language_alb').hide();
            }else if(partnerIdCheck("hr",response.partner_id)){
                if (language == null || language !== "en_hr") {
                      language = 'hr';
                      document.documentElement.lang = "hr";
                }
                document.title = "magenta.box";
                updateDropdownToggle(language);
                $('.language_en_cz,.language_cz,.language_hu,.language_pl,.language_en_pl,.language_sk,.language_en_sk,.language_en_me,.language_me,.language_en_mk,.language_mk,.language_alb').hide();
            }else if(partnerIdCheck("sk",response.partner_id)){
                if (language == null || language !== "en_sk") {
                      language = 'sk';
                      document.documentElement.lang = "sk";
                }
                document.title = "wifi.router";
                updateDropdownToggle(language);

                $('.language_en_pl,.language_en_hr,.language_en_cz,.language_hu,.language_pl,.language_cz,.language_hr,.language_en_me,.language_me,.language_en_mk,.language_mk,.language_alb').hide();
            }else if(partnerIdCheck("me",response.partner_id)){
                if (language == null || language !== "en_me") {
                      language = 'me';
                      document.documentElement.lang = "me";
                }
                document.title = "magenta.box";
                updateDropdownToggle(language);

                $('.language_en_pl,.language_en_hr,.language_en_cz,.language_hu,.language_pl,.language_cz,.language_hr,.language_en_sk,.language_sk,.language_en_mk,.language_mk,.language_alb').hide();
            }else if(partnerIdCheck("mk",response.partner_id)){
                if (language == "en_mk" || language == "alb"){
                      LinkChange();
		}
                else{
                    language = 'mk';
                    document.documentElement.lang = "mk";
                }
                document.title = "magenta.box";
                updateDropdownToggle(language);

                $('.language_en_pl,.language_en_hr,.language_en_cz,.language_hu,.language_pl,.language_cz,.language_hr,.language_en_sk,.language_sk,.language_en_me,.language_me').hide();
            }
            else{
                language = 'en';
                $("#common_header").show();
            }
            var defaultLanguage = language;
            translateData(defaultLanguage);
            if (typeof(Storage) !== "undefined") {
                localStorage.setItem("selectedLang", defaultLanguage);
                sessionStorage.setItem("partnerId", response.partner_id);
            }
            var path = window.location.pathname;
            var page = path.split("/").pop();
            if (page != null && page != '') {
                if (partnerIdCheck("gr", response.partner_id)) {    
                    $('head').append('<style>body:before { background-image: url("images/cosmote-404-page-header.png");margin-top:70px;height: 12px;} </style>');
                    $('link[rel="icon"]').attr('href', 'images/Cosmote_favicon.png');
                }
                else{
                    setFavIconTAndBgColorMagenta();
                }
                $("#404-content").html(tmpl('404-content-tmpl',response));

                var hostname = response.hostname;
                if (hostname === null || hostname === undefined || hostname.trim() === '') {
                    $("#backToMainPageButton").attr("href", "index.html");
                } else {
                    $("#backToMainPageButton").attr("href", "http://" + hostname + "/");
                }
            } else { 
                if (partnerIdCheck("gr", response.partner_id)) {    
                    $('head').append('<style>body:before { background-image: url("images/cosmote-background.png");margin-top:80px;height: 376px;} @media only screen and (max-width: 768px) { body:before { background-image: url("images/cosmote-mobile-background.png");margin-top: 70px;}}</style>');
                    $('link[rel="icon"]').attr('href', 'images/Cosmote_favicon.png');
                }
                else{
                    setFavIconTAndBgColorMagenta();
                }
                $("#main-content").html(tmpl('main-content-tmpl',response));
                fetchUpgradeStatus();
           }
        },
        error: function(jqXHR, textStatus, errorThrown){
            //If a disconnection occurs, the user will be redirected to the home or index page.
            if (textStatus === 'error' && (jqXHR.status === 0 || errorThrown === '')) {
                window.location.href = "/?v=" + new Date().getTime();
                window.location.reload(true);
            }
        }
    });
	
    $("#open_source_content").load("open_source_license.html");
});

function fetchUpgradeStatus(){
    $.ajax({
        type: "GET",
        url: "api/getUpgradeStatus",
        dataType : "json",
        success: function(response){
            if(response.upgradeStatus) {
                $("#restartContent").load("restartUpgradePopUp.html");
                $("#resetContent").load("resetUpgradePopUp.html");
            }else {
                $("#restartContent").load("restartPopUp.html");
                $("#resetContent").load("resetPopUp.html");
            }
        },
        error: function(jqXHR, textStatus, errorThrown){
            //If a disconnection occurs, the user will be redirected to the home or index page.
            if (textStatus === 'error' && (jqXHR.status === 0 || errorThrown === '')) {
                window.location.href = "/?v=" + new Date().getTime();
                window.location.reload(true);
            }
        }
    });
}

function updateDropdownToggle(language) {
    $("#common_header").show();
    var selectedButton = (language == 'alb' ? language.substring(0, 3) : language.substring(0, 2)).toUpperCase();
    $(".dropdown-toggle").html($(".dropdown-toggle").html().replace(" ", selectedButton));
}

function setFavIconTAndBgColorMagenta(){
    $('head').append('<style>body:before { background-color: #E20074; }</style>');
    $('link[rel="icon"]').attr('href', 'images/favicon.ico')
}

const diagnosticDetails = {
    deviceInfo: {url: "api/getDeviceInfo", template: 'diagnostics-device-info-content-tmpl', divId: '#device-info-section', errorAlertTemplate: '#diagnostics-alert-message-tmpl', sectionRefreshBtnId : "#deviceInfoRefreshButton"},
    network: {url: "api/getNetworkInfo", template: 'diagnostics-network-content-tmpl', divId: '#network-info-section',  errorAlertTemplate: '#diagnostics-alert-message-tmpl', sectionRefreshBtnId : "#networkInfoRefreshButton"},
    pppoe: {url: "api/getPPPOEInfo", template: 'diagnostics-pppoe-content-tmpl', divId: '#pppoe-section',  errorAlertTemplate: '#diagnostics-alert-message-tmpl', sectionRefreshBtnId : "#pppoeRefreshButton"},
    wanType: {url: "api/getWanType", template: 'diagnostics-wan-type-content-tmpl', divId: '#wan-section',  errorAlertTemplate: '#diagnostics-alert-message-tmpl', sectionRefreshBtnId : "#gponRefreshButton"},
    telephone: {url: "api/getEUTelephoneInfo", template: 'diagnostics-greece-telephone-content-tmpl', divId: '#telephone-section',  errorAlertTemplate: '#diagnostics-alert-message-tmpl', sectionRefreshBtnId : "#telephoneRefreshButton"},
};

function fetchData(url) {
    return $.ajax({type: "GET", url, dataType : "json", async: true, timeout: 5000});
}

function sanitizeData(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sanitizeData);
    } else if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const key in obj) {
            sanitized[key] = sanitizeData(obj[key]);
        }
        return sanitized;
    } else if (obj === "-" || obj === "" || obj === null || obj === "N/A") {
        var lang = localStorage.getItem("selectedLang");
        lang = lang.toUpperCase();

        if(lang == "PL"){
            return "Dane są niedostępne";
        } else if (lang == "SK"){
            return "";
        }  else if (lang == "MK"){
            return "Не се достапни податоци";
        }  else if (lang == "CZ"){
            return "Žádná data k dispozici";
        }  else if (lang == "GR"){
            return "Žádná data k dispozici";
        }  else if (lang == "HR"){
            return "Podaci nisu dostupni";
        }  else if (lang == "HU"){
            return "";
        }  else if (lang == "ME"){
            return "Nema dostupnih podataka";
        }  else if (lang == "ALB"){
            return "Nuk ka të dhëna në dispozicion";
        } else {
            return "Data not available";
        }
    } else {
        return obj;
    }
}

function renderDiagnosticsData(response, template, divId) {
    const sanitizedResponse = sanitizeData(response);
    $(divId).html(tmpl(template, sanitizedResponse));
    translateData($("#language-select li").find('selected').attr('data-value'));
}

function renderErrorState(url, divId, errorAlertTemplate, sectionRefreshBtnId) {
    if (url === "api/getWanType"){
        $(divId).html($(errorAlertTemplate).html());
        $(divId).prepend($("#diagnostics-gpon-tmpl").html());
    } else {
        $(divId).html($(errorAlertTemplate).html());
    }
    $(sectionRefreshBtnId).show();
    translateData($("#language-select li").find('selected').attr('data-value'));
}

function diagnosticAjaxComplete() {
    var PartnerId = sessionStorage.getItem("partnerId");
    if (partnerIdCheck("hr",PartnerId) || partnerIdCheck("gr",PartnerId) ) {
        $('.div_hr').hide();
    } else if (partnerIdCheck("sk",PartnerId)) {
        $('.div_sk').hide();
    }else if (partnerIdCheck("mk",PartnerId)) {
        $('.div_mk').hide();
    }
    else if (partnerIdCheck("me",PartnerId)) {
        $('.div_me').hide();
    }
}

function fetchDataAndRender(url, template, divId, errorAlertTemplate, sectionRefreshBtnId) {
    fetchData(url)
        .done(response => renderDiagnosticsData(response, template, divId))
        .fail(() => renderErrorState(url, divId, errorAlertTemplate, sectionRefreshBtnId))
        .always(diagnosticAjaxComplete);
}

function fetchDiagnosticsInfo() {
    var PartnerId = sessionStorage.getItem("partnerId");
    for (let key in diagnosticDetails) {
        if (key === 'telephone' && !partnerIdCheck("gr",PartnerId)) {
            continue;
        }
        fetchDataAndRender(diagnosticDetails[key].url, diagnosticDetails[key].template, diagnosticDetails[key].divId, diagnosticDetails[key].errorAlertTemplate, diagnosticDetails[key].sectionRefreshBtnId);
    }
    appendModalFooter();
}

function refreshSection(sectionKey){
    if (diagnosticDetails[sectionKey].url === "api/getWanType"){
        $(diagnosticDetails[sectionKey].divId).html('<h4 data-label="GPON"></h4><img class="refreshIcon" src="images/refreshIcon.png" alt="Loading"/>');
        translateData($("#language-select li").find('selected').attr('data-value'));
    }
    else{
        $(diagnosticDetails[sectionKey].divId).html('<img class="refreshIcon" src="images/refreshIcon.png" alt="Loading"/>');
    }
    $(diagnosticDetails[sectionKey].sectionRefreshBtnId).hide();
    
    fetchData(diagnosticDetails[sectionKey].url)
        .done(response => renderDiagnosticsData(response, diagnosticDetails[sectionKey].template, diagnosticDetails[sectionKey].divId))
        .fail(() => renderErrorState(diagnosticDetails[sectionKey].url, diagnosticDetails[sectionKey].divId, diagnosticDetails[sectionKey].errorAlertTemplate, diagnosticDetails[sectionKey].sectionRefreshBtnId))
        .always(diagnosticAjaxComplete);
}

function appendModalFooter() {
    if (!$('#diagnosticsModal .modal-content').find('.modal-footer').length) {
		var partnerId  = sessionStorage.getItem("partnerId");
        var imgSrc = partnerIdCheck("gr", partnerId) ? "images/InfoIcon.png" : "images/resetIcon.png";
        var altText = partnerIdCheck("gr", partnerId) ? "Info" : "reset";
        $('#diagnosticsModal .modal-content').append('<div class="modal-footer"><button type="button" onclick="hideDiagnosticsModal()" data-toggle="modal" data-target="#resetModal" data-keyboard="false" data-backdrop="static" class="btn btn-default resetBtn pull-left focusable" ><img aria-hidden=”true” src="' + imgSrc + '" /><span data-label="FACTORY_RESET"/></button></div>');
        translateData($("#language-select li").find('selected').attr('data-value'));
    }
}


function refreshStatus() {
    $(".ref_txt").find('a').find('img').addClass("refreshIcon");
    $('.refreshStatusLink').css('pointer-events','none');
    $(".refreshStatusLink").css("color", "#808080");
    $.ajax({
        type: "GET",
        url: "api/getRouterStatus",
        dataType : "json",
        success: function(response){
            if(partnerIdCheck("hu",response.partner_id)){
                response.partner_id = 'telekom-pl';
            }
            $("#main-content").html(tmpl('main-content-tmpl',response));
            $('img[data-alt="ALT_REFRESH_STARTED"]').attr('data-alt', 'ALT_REFRESH_COMPLETED');
            translateData($("#language-select li").find('selected').attr('data-value'));
        },
        error: function(jqXHR, textStatus, errorThrown){
            $('img[data-alt="ALT_REFRESH_STARTED"]').attr('data-alt', 'ALT_REFRESH_INCOMPLETED');
            //If a disconnection occurs, the user will be redirected to the home or index page.
            if (textStatus === 'error' && (jqXHR.status === 0 || errorThrown === '')) {
                window.location.href = "/?v=" + new Date().getTime();
                window.location.reload(true);
            }
        },
        complete: function(){
            $('.refreshStatusLink').css('pointer-events','');
            $(".refreshStatusLink").css("color", "#333");
        }
    });
}

function hideDiagnosticsModal() {
    $("#diagnosticsModal").removeClass("fade").modal("hide");
    var partnerId  = sessionStorage.getItem("partnerId");
    if(partnerIdCheck("mk",partnerId)){
        if($(window).width() <= 768) {
            $(".resetPopUpContent").css('min-height', '500px');
        }
    }
}

function showRestartText() {
	$("#restartModal").find("div.modal-sm").removeClass("applyPosition");
	$("#restartPopUpImageContent").show();
	$(".restartPopupBtn").hide();
	$(".hideInstRestartBtn").show();
	$("#restartPopUpWithoutImageContent").hide();
        var partnerId  = sessionStorage.getItem("partnerId");
	if($(window).width() <= 768) {
            if(partnerIdCheck("mk",partnerId)){
               $(".restartModalContent").height(660);
            }
            else{
               $(".restartModalContent").height(560);
            }
	} else {
            if(partnerIdCheck("mk",partnerId)){
               $(".restartModalContent").height(420);
            }
            else{
               $(".restartModalContent").height(380);
            }
	}
}

function hideRestartText() {
	$("#restartModal").find("div.modal-sm").addClass("applyPosition");
	$("#restartPopUpImageContent").hide();
	$("#restartPopUpWithoutImageContent").show();
	$(".hideInstRestartBtn").hide();
	$(".restartPopupBtn").show();
	if($(window).width() <= 768) {
		$(".restartModalContent").height(165);
	} else {
		$(".restartModalContent").height(110);
	}
}

function showResetText() {
	$("#resetModal").find("div.modal-sm").removeClass("applyPosition");
	$("#resetPopUpImageContent").show();
	$(".hideInstResetBtn").show();
	$("#resetPopUpWithoutImageContent").hide();
	$(".resetPopupBtn").hide();
	if($(window).width() <= 768) {
		$(".resetModalContent").height(600);
	} else {
		$(".resetModalContent").height(400);
	}
}

function hideResetText() {
	$("#resetModal").find("div.modal-sm").addClass("applyPosition");
	$("#resetPopUpImageContent").hide();
	$("#resetPopUpWithoutImageContent").show();
	$(".resetPopupBtn").show();
	$(".hideInstResetBtn").hide();
	if($(window).width() <= 768) {
		$(".resetModalContent").height(165);
	} else {
		$(".resetModalContent").height(110);
	}
}

function partnerIdCheck(nacto,id){
    if(nacto == "hu" && (id == "telekom-hu" || id == "telekom-dev-hu" || id == "telekom-hu-test")) {
	return true
    } else if(nacto == "pl" && (id == "telekom-pl" || id == "telekom-dev-pl" || id == "telekom-pl-test")) {
	return true
    } else if(nacto == "hr" && (id == "telekom-hr" || id == "telekom-dev-hr" || id == "telekom-hr-test")) {
	return true
    }else if(nacto == "cz" && (id == "telekom-cz" || id == "telekom-dev-cz" || id == "telekom-cz-test")) {
	return true
    }else if(nacto == "gr" && (id == "telekom-gr" || id == "telekom-dev-gr" || id == "telekom-gr-test")) {
	return true
    }else if(nacto == "sk" && (id == "telekom-sk" || id == "telekom-dev-sk" || id == "telekom-sk-test")) {
	return true
    }else if(nacto == "me" && (id == "telekom-me" || id == "telekom-dev-me" || id == "telekom-me-test")) {
        return true
    }else if(nacto == "mk" && (id == "telekom-mk" || id == "telekom-dev-mk" || id == "telekom-mk-test")) {
        return true
    }else {
	return false
    }
}

function LinkChange(){

    var lang = localStorage.getItem("selectedLang");
    const isHighContrast = window.matchMedia('(forced-colors: active)').matches ||
                         window.matchMedia('(-ms-high-contrast: active)').matches;

    if (isHighContrast) {
        applyHighContrastImages();
    }

    if(lang != null){
        lang = lang.toUpperCase();
        if(lang == "PL"){
            $("#appstore").attr("href", "https://apps.apple.com/pl/app/m%C3%B3j-t-mobile/id495153613?l=pl");
            $("#playstore").attr("href", "https://play.google.com/store/apps/details?id=pl.tmobile.miboa&hl=pl");
            $("#mobappstore").attr("href", "https://apps.apple.com/pl/app/m%C3%B3j-t-mobile/id495153613?l=pl");
            $("#mobplaystore").attr("href", "https://play.google.com/store/apps/details?id=pl.tmobile.miboa&hl=pl");
            $("#appstoreImage").attr('src', 'images/PL_AppStoreBTN.png');
            $("#playstoreImage").attr('src', 'images/PL_PlayStoreBTN.png');
            $("#mobappstoreImage").attr('src', 'images/PL_AppStoreBTN.png');
            $("#mobplaystoreImage").attr('src', 'images/PL_PlayStoreBTN.png');
            document.documentElement.lang = "pl";
        }
        else if(lang == "CZ"){
            $("#appstore").attr("href", "https://apps.apple.com/cz/app/m%C5%AFj-t-mobile/id1386652007");
            $("#playstore").attr("href", "https://play.google.com/store/apps/details?id=cz.tmobile.oneapp");
            $("#Huaweistore").attr("href", "https://appgallery.huawei.com/#/app/C101395653?locale=cs_CZ&source=appshare&subsource=C101395653");
            $("#mobappstore").attr("href", "https://apps.apple.com/cz/app/m%C5%AFj-t-mobile/id1386652007");
            $("#mobplaystore").attr("href", "https://play.google.com/store/apps/details?id=cz.tmobile.oneapp");
            $("#mobhuaweistore").attr("href", "https://appgallery.huawei.com/#/app/C101395653?locale=cs_CZ&source=appshare&subsource=C101395653");
            $("#appstoreImage").attr('src', 'images/CZ_AppStoreBTN.png');
            $("#playstoreImage").attr('src', 'images/CZ_PlayStoreBTN.png');
            $("#HuaweistoreImage").attr('src', 'images/CZ_HuaweiStoreBTN.png');
            $("#mobappstoreImage").attr('src', 'images/CZ_AppStoreBTN.png');
            $("#mobplaystoreImage").attr('src', 'images/CZ_PlayStoreBTN.png');
            $("#mobhuaweistoreImage").attr('src', 'images/CZ_HuaweiStoreBTN.png');
            document.documentElement.lang = "cz";
        }
        else if(lang == "SK"){

            $("#appstore").attr("href", "https://telekomsk.page.link/TX4L");
            $("#playstore").attr("href", "https://telekomsk.page.link/TX4L");
            $("#Huaweistore").attr("href", "https://telekomsk.page.link/TX4L");
            $("#mobappstore").attr("href", "https://telekomsk.page.link/TX4L");
            $("#mobplaystore").attr("href", "https://telekomsk.page.link/TX4L");
            $("#mobhuaweistore").attr("href", "https://telekomsk.page.link/TX4L");
            $("#appstoreImage").attr('src', 'images/SK_AppStoreBTN.png');
            $("#playstoreImage").attr('src', 'images/SK_PlayStoreBTN.png');
            $("#HuaweistoreImage").attr('src', 'images/SK_HuaweiStoreBTN.png');
            $("#mobappstoreImage").attr('src', 'images/SK_AppStoreBTN.png');
            $("#mobplaystoreImage").attr('src', 'images/SK_PlayStoreBTN.png');
            $("#mobhuaweistoreImage").attr('src', 'images/SK_HuaweiStoreBTN.png');
            document.documentElement.lang = "sk";
        }
        else if(lang == "MK" || lang == "ALB"){
            if(lang == "MK")
                document.documentElement.lang = "mk";
            else if(lang == "ALB")
                document.documentElement.lang = "sq";
        }
        else if(lang == "GR"){
            $('.gr_bg h2').attr('id', 'gr_h2');
            document.documentElement.lang = "el";
        }
        else if(lang.includes("EN") == true){
            document.documentElement.lang = "en";
            var partnerId = sessionStorage.getItem("partnerId");
            if(partnerIdCheck("pl",partnerId)){
                $("#appstore").attr("href", "https://apps.apple.com/pl/app/m%C3%B3j-t-mobile/id495153613?l=en");
                $("#playstore").attr("href", "https://play.google.com/store/apps/details?id=pl.tmobile.miboa&hl=en");
                $("#mobappstore").attr("href", "https://apps.apple.com/pl/app/m%C3%B3j-t-mobile/id495153613?l=en");
                $("#mobplaystore").attr("href", "https://play.google.com/store/apps/details?id=pl.tmobile.miboa&hl=en");
                $("#appstoreImage").attr('src', 'images/PL_AppStoreBTN-ENG.png');
                $("#playstoreImage").attr('src', 'images/PL_PlayStoreBTN-ENG.png');
                $("#mobappstoreImage").attr('src', 'images/PL_AppStoreBTN-ENG.png');
                $("#mobplaystoreImage").attr('src', 'images/PL_PlayStoreBTN-ENG.png');
            }
            else if(partnerIdCheck("cz",partnerId)){
                $("#appstore").attr("href", "https://apps.apple.com/cz/app/m%C5%AFj-t-mobile/id1386652007");
                $("#playstore").attr("href", "https://play.google.com/store/apps/details?id=cz.tmobile.oneapp");
                $("#Huaweistore").attr("href", "https://appgallery.huawei.com/#/app/C101395653?locale=cs_CZ&source=appshare&subsource=C101395653");
                $("#mobappstore").attr("href", "https://apps.apple.com/cz/app/m%C5%AFj-t-mobile/id1386652007");
                $("#mobplaystore").attr("href", "https://play.google.com/store/apps/details?id=cz.tmobile.oneapp");
                $("#mobhuaweistore").attr("href", "https://appgallery.huawei.com/#/app/C101395653?locale=cs_CZ&source=appshare&subsource=C101395653");
                $("#appstoreImage").attr('src', 'images/EN_AppStoreBTN.png');
                $("#playstoreImage").attr('src', 'images/EN_PlayStoreBTN.png');
                $("#HuaweistoreImage").attr('src', 'images/EN_HuaweiStoreBTN.png');
                $("#mobappstoreImage").attr('src', 'images/EN_AppStoreBTN.png');
                $("#mobplaystoreImage").attr('src', 'images/EN_PlayStoreBTN.png');
                $("#mobhuaweistoreImage").attr('src', 'images/EN_HuaweiStoreBTN.png');
            }
            else if(partnerIdCheck("hr",partnerId)){
                $("#hrOneAppImg").attr('src', 'images/HR-oneapp-img.png');
                $("#mobHrOneAppImg").attr('src', 'images/HR-oneapp-img.png');
            }
            else if(partnerIdCheck("sk",partnerId)){

                $("#appstore").attr("href", "https://telekomsk.page.link/TX4L");
                $("#playstore").attr("href", "https://telekomsk.page.link/TX4L");
                $("#Huaweistore").attr("href", "https://telekomsk.page.link/TX4L");
                $("#mobappstore").attr("href", "https://telekomsk.page.link/TX4L");
                $("#mobplaystore").attr("href", "https://telekomsk.page.link/TX4L");
                $("#mobhuaweistore").attr("href", "https://telekomsk.page.link/TX4L");
                $("#appstoreImage").attr('src', 'images/EN_AppStoreBTN.png');
                $("#playstoreImage").attr('src', 'images/EN_PlayStoreBTN.png');
                $("#HuaweistoreImage").attr('src', 'images/EN_HuaweiStoreBTN.png');
                $("#mobappstoreImage").attr('src', 'images/EN_AppStoreBTN.png');
                $("#mobplaystoreImage").attr('src', 'images/EN_PlayStoreBTN.png');
                $("#mobhuaweistoreImage").attr('src', 'images/EN_HuaweiStoreBTN.png');
            }
            else if(partnerIdCheck("gr",partnerId)){
                $("#gr_h2").removeAttr("id");
            }
        }
        else if(lang == "HR"){
            document.documentElement.lang = "hr";
            $("#hrOneAppImg").attr('src', 'images/HR-version-oneapp-img.png');
            $("#mobHrOneAppImg").attr('src', 'images/HR-version-oneapp-img.png');
        }
    }
}

function applyHighContrastImages() {

    $(".restart_image_switch_pl").removeAttr("src").attr("src", "images/restartImg_PL_High_Contrast.png");
    $(".restart_image_switch_cz").removeAttr("src").attr("src", "images/restartImg_PL_High_Contrast.png");
    $(".restart_image_switch_sk").removeAttr("src").attr("src", "images/restartImg_PL_High_Contrast.png");

    $(".restart_image_switch_hr").removeAttr("src").attr("src", "images/restartImg_ME_High_Contrast.png");
    $(".restart_image_switch_mk").removeAttr("src").attr("src", "images/restartImg_ME_High_Contrast.png");
    $(".restart_image_switch_me").removeAttr("src").attr("src", "images/restartImg_ME_High_Contrast.png");
    $(".restart_image_switch_gr").removeAttr("src").attr("src", "images/restartImg_ME_High_Contrast.png");
  
    $(".reset_image_switch_pl").removeAttr("src").attr("src", "images/resetImg_PL_High_Contrast.png");
    $(".reset_image_switch_cz").removeAttr("src").attr("src", "images/resetImg_PL_High_Contrast.png");
    $(".reset_image_switch_sk").removeAttr("src").attr("src", "images/resetImg_PL_High_Contrast.png");

    $(".reset_image_switch_hr").removeAttr("src").attr("src", "images/resetImg_ME_High_Contrast.png");
    $(".reset_image_switch_mk").removeAttr("src").attr("src", "images/resetImg_ME_High_Contrast.png");
    $(".reset_image_switch_me").removeAttr("src").attr("src", "images/resetImg_ME_High_Contrast.png");
    $(".reset_image_switch_gr").removeAttr("src").attr("src", "images/resetImg_ME_High_Contrast.png");
}