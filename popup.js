/**
 * @var chrome
 * @see https://developer.chrome.com/extensions/api_index
 */

window.addEventListener('load', init);

function init() {
    document.querySelectorAll('.auto-option').forEach((checkbox) => {
        registerOption(checkbox, checkbox.id, checkbox.checked);
    });

    document.querySelectorAll('.auto-select').forEach((select) => {
        registerSelect(select, select.id, select.value);
    });
}

function registerOption(checkbox, optionsKey, defaultValue) {

    chrome.storage.sync.get({[optionsKey]: defaultValue}, function (options) {
        checkbox.checked = options[optionsKey];
    });

    checkbox.addEventListener('change', function () {
        chrome.storage.sync.set({[optionsKey]: checkbox.checked});
    }, {passive: true});
}

function registerSelect(select, selectKey, defaultValue) {

    chrome.storage.sync.get({[selectKey]: defaultValue}, function (options) {
        select.value = options[selectKey];
    });

    select.addEventListener('change', function () {
        chrome.storage.sync.set({[selectKey]: select.value});
    }, {passive: true});
}

