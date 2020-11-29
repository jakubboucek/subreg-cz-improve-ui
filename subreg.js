/**
 * @var chrome
 * @see https://developer.chrome.com/extensions/api_index
 */

const currentLang = (() => {
    const match = /^\/(cz|en)(?:\/|$)?/.exec(location.pathname);
    return match ? match[1] : 'cz';
})();

const loginPopup = document.querySelector('#login_popup');
if (loginPopup) {
    const switchAdmin = (isAdmin) => {
        const ut = loginPopup.querySelector('#user-tab');
        const at = loginPopup.querySelector('#admin-tab');
        const ul = loginPopup.querySelector('#user-link');
        const al = loginPopup.querySelector('#admin-link');

        const user = isAdmin ? 'nonactive' : 'active';
        const admin = isAdmin ? 'active' : 'nonactive';

        // remove legacy styles
        [ut, at].forEach((element) => element.removeAttribute('style'));

        [ut, ul].forEach((element) => {
            element.classList.add(user);
            element.classList.remove(admin);
        });

        [at, al].forEach((element) => {
            element.classList.add(admin);
            element.classList.remove(user);
        });
    }

    chrome.storage.sync.get({preferAdminLogin: false}, function (options) {
        switchAdmin(options.preferAdminLogin === true);
    });

    loginPopup.querySelectorAll('input[type="text"], input[type="password"]').forEach((element) => {
        element.setAttribute('required', '');

        // Remove stupid event: this.value='';
        element.removeAttribute('onclick');
    });

    loginPopup.querySelectorAll('#login , #sk_reseller').forEach((element) => {
        // currently unable to apply for #sk_user - chrome is filling nonsense
        element.setAttribute('autocomplete', 'username');
    });

    loginPopup.querySelectorAll('#heslo, #sk_password').forEach((element) => {
        element.setAttribute('autocomplete', 'current-password');

        // Remove stupid event: this.value='';
        element.removeAttribute('onclick');
    });

    const focusForm = () => {
        chrome.storage.sync.get({loginAutofocus: 'login'}, function (options) {
            let selector;

            const target = options.loginAutofocus;
            switch (target) {
                case 'admin':
                    selector = 'form.active #login, form.active #sk_reseller';
                    break;
                case 'login':
                    selector = 'form.active #login, form.active #sk_user';
                    break;
                case 'password':
                    selector = 'form.active #heslo, form.active #sk_password';
                    break;
                default:
                    throw `Invalid autofocus selector: ${target}`;
            }

            const element = loginPopup.querySelector(selector);
            element.focus();
            element.select();
        });
    }

    // Observe popup showing
    new MutationObserver(() => {
        if (loginPopup.style.display !== 'none') {
            focusForm();
        }
    }).observe(loginPopup, {attributes: true, childList: false, subtree: false, attributeFilter: ["style"]});

    // Observe tab switching
    new MutationObserver(() => {
        if (loginPopup.style.display !== 'none') {
            focusForm();
        }
    }).observe(loginPopup.querySelector('form'), {
        attributes: true,
        childList: false,
        subtree: false,
        attributeFilter: ["class"]
    });

    if (loginPopup.style.display !== 'none') {
        focusForm();
    }
}

