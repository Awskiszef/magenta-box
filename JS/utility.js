$(function() {
    $('#language-select li').click(function(){
        $('#language-select li').removeClass('selected');
        $(this).addClass('selected');
        $('#language-select li').find('a').removeClass('selected');
        $(this).find('a').addClass('selected');
        var selectedLang = $('#language-select li').find('a.selected').html();
        $('.dropdown-toggle').text(selectedLang);
        var lang = $(this).attr('data-value');
        if (lang == "en_gr" || lang =="gr"){
            $(".dropdown-toggle").append('<img src="images/down-arrow_GR.png" alt="Down arrow"/>');
        }
        else{
            $(".dropdown-toggle").append('<img src="images/down-arrow.png" alt="Down arrow"/>');
        }
        translateData(lang);
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem("selectedLang", lang);
        }
    });
});

function translateData(selText) {
    $('#language-select').find('[data-value^='+selText+']').addClass("selected");
    translator.init({
        languageEl: '#language-select',
        langValue: function () {
           return selText;
        }
    });
}

function unfocusrestartbtn() {
    $('body').on('hidden.bs.modal', '.modal', function() {
        $('.btn').blur();
    }); 
}

async function cacheLanguageToSession() {
    try {
        const response = await fetch('/languages/index.json');
        if (!response.ok) throw new Error(`Failed to fetch index: ${response.statusText}`);

        const languageFiles = await response.json();

        languageFiles.forEach(fileURL => {
            const langCode = fileURL.match(/([^/]+)(?=\.\w+$)/)[0];
            sessionStorage.removeItem(`${langCode}_json`);
        });

        for (const fileURL of languageFiles) {
            const langCode = fileURL.match(/([^/]+)(?=\.\w+$)/)[0];
            const fileResponse = await fetch(fileURL);
            if (!fileResponse.ok) throw new Error(`Failed to fetch ${fileURL}: ${fileResponse.statusText}`);

            const jsonData = await fileResponse.json();
            sessionStorage.setItem(`${langCode}_json`, JSON.stringify(jsonData));
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

function initKeyboardNavigation() {
    let focusable = [], currentIndex = 0;

    function updateFocusableElements() {
        const modal = document.querySelector('.modal.in, .modal.show');
        const container = modal || document.body;

        focusable = [...container.querySelectorAll('.focusable')].filter(el =>
            !el.hasAttribute('disabled') && el.offsetParent !== null
        );

        focusable.forEach(el => {
            if (!el.hasAttribute('tabindex') &&
                !['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
                el.setAttribute('tabindex', '0');
            }
        });
    }

    function handleGlobalNavigation(key) {
        if (!focusable.length) return;

        currentIndex = (key === 'ArrowRight' || key === 'ArrowDown')
            ? (currentIndex + 1) % focusable.length
            : (currentIndex - 1 + focusable.length) % focusable.length;

        focusable[currentIndex].focus();
    }

    function getOpenDropdownMenu() {
        const openDropdown = document.querySelector('.dropdown.open .dropdown-menu');
        return openDropdown || null;
    }

    function getVisibleLanguageItems() {
        const menu = getOpenDropdownMenu();
        if (!menu) return [];
        return [...menu.querySelectorAll('li')].filter(
            item => item.offsetParent !== null && item.style.display !== 'none'
        );
    }

    function navigateLanguageMenu(key) {
        const items = getVisibleLanguageItems();
        if (!items.length) return;

        let index = items.findIndex(i => i.querySelector("a").classList.contains("hovered"));
        if (index === -1) index = 0;
        else index = key === "ArrowDown"
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length;

        document.querySelectorAll(".dropdown-menu li a.hovered").forEach(a => a.classList.remove("hovered"));
        const next = items[index].querySelector("a");
        if (next) {
            next.classList.add("hovered");
            next.focus();  // optional: for accessibility
        }
    }

    function clickHoveredItemIfAny() {
        const hovered = document.querySelector(".dropdown.open .dropdown-menu li a.hovered");
        if (hovered) {
            hovered.click();
            if (typeof LinkChange === "function") LinkChange();
        }
    }

    function handleKeyDown(e) {
        const key = e.key;
        const isModalOpen = document.body.classList.contains('modal-open');
        const modal = document.querySelector('.modal.in, .modal.show');
        const dropdownOpen = document.querySelector('.dropdown.open') !== null;

        if (isModalOpen && modal) {
            const scrollContainer = modal.querySelector('.modal-in') || modal;
            if (key === "ArrowLeft" || key === "ArrowRight") {
                e.preventDefault();
                updateFocusableElements();
                handleGlobalNavigation(key);
            } else if (key === "ArrowUp") {
                e.preventDefault();
                scrollContainer.scrollBy({ top: -40, behavior: "smooth" });
            } else if (key === "ArrowDown") {
                e.preventDefault();
                scrollContainer.scrollBy({ top: 40, behavior: "smooth" });
            }
            return;
        }

        if (key === "ArrowLeft" || key === "ArrowRight") {
            e.preventDefault();
            updateFocusableElements();
            handleGlobalNavigation(key);
        } else if (dropdownOpen && currentIndex === 0) {
            if (key === "Enter") {
                e.preventDefault();
                clickHoveredItemIfAny();
            } else if (key === "ArrowUp" || key === "ArrowDown") {
                e.preventDefault();
                navigateLanguageMenu(key);
            }
        }
    }

    // Observe DOM for focusable elements
    updateFocusableElements();
    new MutationObserver(updateFocusableElements).observe(document.body, { childList: true, subtree: true });

    // Keydown listener
    document.addEventListener("keydown", handleKeyDown);

    // Modal overflow handling
    $(document).on('shown.bs.modal', function () {
        document.body.style.overflow = 'hidden';
        updateFocusableElements();
        if (focusable.length) focusable[0].focus();
    });

    $(document).on('hidden.bs.modal', function () {
        if (!$('.modal.show').length) {
            document.body.style.overflow = '';
        }
    });

    // Modal ESC to close
    $(document).off('keydown.closeModals').on('keydown.closeModals', function(e) {
        if (e.key === "Escape" || e.keyCode === 27) {
            $('#restartModal, #resetModal, #diagnosticsModal, #open_source_popup').modal('hide');
        }
    });

    // Auto-hover first language item on dropdown open
    $(document).on('shown.bs.dropdown', function () {
        const items = getVisibleLanguageItems();
        if (items.length) {
            document.querySelectorAll(".dropdown-menu li a.hovered").forEach(a => a.classList.remove("hovered"));
        }
    });
}
