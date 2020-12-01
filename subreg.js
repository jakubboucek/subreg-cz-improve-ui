/**
 * @var chrome
 * @see https://developer.chrome.com/extensions/api_index
 */

const currentUrl = new URL(location.toString());

const langPattern = 'cz|en';

const currentLang = (() => {
    const match = new RegExp(`^/(${langPattern})(?:/|\$)`).exec(currentUrl.pathname);
    return match ? match[1] : 'cz';
})();

const getOption = (() => {
    // Async Preload all options
    const optionsPromise = new Promise((resolve) => {
        const options = {
            preferAdminLogin: false,
            loginAutofocus: 'login',
            silentRedAlerts: true,
            watchOrderStatus: false,
        };

        chrome.storage.sync.get(options, function (options) {
            resolve(options);
        });
    });

    // provide async getter for option
    return async (key) => {
        const options = await optionsPromise;
        if (options.hasOwnProperty(key) === false)
            throw new Error(`Option '${key}' doesn't exists.`);

        return options[key];
    }
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

    getOption('preferAdminLogin').then(preferAdminLogin => switchAdmin(preferAdminLogin));

    loginPopup.querySelectorAll('input[type="text"], input[type="password"]').forEach((element) => {
        element.setAttribute('required', '');
    });

    loginPopup.querySelectorAll('#login , #sk_reseller').forEach((element) => {
        element.setAttribute('autocomplete', 'username');
    });

    loginPopup.querySelectorAll('#heslo, #sk_password').forEach((element) => {
        element.setAttribute('autocomplete', 'current-password');

        // Remove stupid event: this.value='';
        element.removeAttribute('onclick');
    });

    // Fix lost of URL to continue when user put invalid credentials
    const nextInputs = loginPopup.querySelectorAll('input[name="next"]');

    if (currentUrl.searchParams.has('_saved_next')) {
        // Refresh lost value from URL parameter
        const next = currentUrl.searchParams.get('_saved_next');
        nextInputs.forEach(input => input.value = next);
    } else if (nextInputs) {
        // Store valid value to form action URL to restore it on next page (when user put invalid credential)
        const next = nextInputs[0].value;
        loginPopup.querySelectorAll('form').forEach(form => {
            const url = new URL(form.action);
            url.searchParams.set('_saved_next', next);
            form.action = url.toString();
        });
        nextInputs.forEach(input => input.value = next);
    }

    const focusForm = async () => {
        if (loginPopup.style.display === 'none') {
            return;
        }

        const target = await getOption('loginAutofocus');
        let selector;

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
    }

    // Observe popup showing
    new MutationObserver(focusForm)
        .observe(loginPopup, {attributes: true, childList: false, subtree: false, attributeFilter: ["style"]});

    // Observe tab switching
    new MutationObserver(focusForm)
        .observe(loginPopup.querySelector('form'), {
            attributes: true,
            childList: false,
            subtree: false,
            attributeFilter: ["class"]
        });

    focusForm();

    // Admin login via admin#user login
    loginPopup.querySelector('#user-tab').addEventListener('submit', (event) => {
        const login = loginPopup.querySelector('#login').value;
        const match = /^(?<admin>.+)#(?<login>.+)$/.exec(login);
        if (match === null) {
            return;
        }

        event.preventDefault();

        loginPopup.querySelector('#sk_reseller').value = match.groups.admin;
        loginPopup.querySelector('#sk_user').value = match.groups.login;
        loginPopup.querySelector('#sk_password').value = loginPopup.querySelector('#heslo').value;
        loginPopup.querySelector('#admin-tab input[type="submit"], #admin-tab button').click();
    });
}

// Domain list without annoying default filter as default
document.querySelectorAll(`a[href^="/${currentLang}/domain/list"]`).forEach((element) => {
    const url = new URL(element.href);
    const params = url.searchParams;
    params.set('filtrslozka', '-');
    params.set('pagelimit', '100');
    element.href = url.toString();
});

// Append link to renew list to menu
const menuLink = document.querySelector(`#leftSide ul.menuBox a[href="/${currentLang}/domain/bulk"]`);
if (menuLink) {
    const li = menuLink.parentElement;
    const box = li.parentElement;
    const renewList = li.cloneNode(true);
    const renewLink = renewList.querySelector('a');
    renewLink.href = `/${currentLang}/domain/renewlist/`;
    renewLink.textContent = "Přehled domén k prodloužení";
    box.insertBefore(renewList, li);
}

// Clean annoying promoted links and too yellings alerts
(async function () {
    const silentRedAlerts = await getOption('silentRedAlerts');
    const menu = document.querySelector('#leftSide');
    document.querySelectorAll('strong.textRed').forEach((element) => {
        const inMenu = menu.contains(element);
        if (inMenu === false && silentRedAlerts === false) return;

        const parent = element.parentElement;
        while (element.firstChild) {
            const ch = element.firstChild;
            parent.insertBefore(ch, element);

            if (inMenu) {
                // Remove uppercasing
                ch.textContent = ch.textContent.charAt(0).toUpperCase() + ch.textContent.slice(1).toLowerCase();
            }
        }
        parent.removeChild(element);
    });

    if (silentRedAlerts) {
        document.querySelectorAll('.textRed').forEach((element) => {
            element.classList.remove('textRed');
        });
    }
})();

// Fix invalid BIND export where domain FQN longer than 40 chars
if (new RegExp(`^/(?:${langPattern})/dns/domain(?:/|\$)`).test(currentUrl.pathname)
    && currentUrl.searchParams.get('tab') === 'export') {
    const bindExport = document.querySelector('pre');

    bindExport.textContent = bindExport.textContent.replace(
        /^(?<domain>\S{39,}\.)(?<type>A|AAAA|CNAME|MX|TXT|SPF|SRV|NS|PTR|TLSA|CAA|SSHFP)\t/gm,
        '$1 $2\t'
    );
}

// Order watcher
(function () {
    const stopWords = ['Completed', 'Failed', 'Pending_Authorization', 'Wait_For_Payment', 'Wait_For_Documents'];

    // Check if orderinfo page
    if (new RegExp(`^/(?:${langPattern})/domain/orderinfo(?:/|\$)`).test(currentUrl.pathname) === false
        || currentUrl.searchParams.has('orderid') === false) {
        return;
    }

    // Search table of order info > row with order status
    const target = document.querySelector('#content table tr:nth-child(7) > td:nth-child(2)');
    if (target === null) return;

    // Parse basic key of status value
    const match = new RegExp('^[\\w_]+').exec(target.innerText.trim());
    if (match === null || stopWords.includes(match[0])) return;

    const fetchOrderStatus = async (orderId) => {
        const url = new URL(`https://subreg.cz/${currentLang}/domain/status`);
        url.searchParams.set('filtrid', orderId);
        const response = await fetch(url.toString(), {credentials: 'same-origin'}).then(response => response.blob());

        return new DOMParser()
            .parseFromString(await response.text(), response.type)
            .querySelector('table.listdomen tr:nth-child(2) td:nth-child(5)')
            ?.textContent
            .trim();
    }

    const orderId = currentUrl.searchParams.get('orderid');

    // Move text & flat nodes to span "Label" - will be used as label
    const label = document.createElement('span');
    while (target.firstChild
    && (target.firstChild.nodeType === Node.TEXT_NODE
        || (target.firstChild.nodeType === Node.ELEMENT_NODE && target.firstChild.tagName === 'A'))) {
        label.appendChild(target.firstChild);
    }
    target.firstChild ? target.insertBefore(label, target.firstChild) : target.appendChild(label);

    const recording = document.createElement('span');
    recording.textContent = '●';
    recording.className = 'recording';

    const appender = document.createElement('div');
    appender.innerHTML = `<button class="button buttonSmall">Sledovat změnu stavu</button>`;
    const a = appender.firstChild;

    target.appendChild(appender);

    let cancel;

    const check = (orderId) => {
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                try {
                    label.textContent = "Načítám…";
                    fetchOrderStatus(orderId)
                        .then(status => {
                            label.textContent = status;
                            if (stopWords.includes(status)) {
                                resolve(status);
                            }
                        })
                        .catch((e) => {
                            throw e;
                        });
                } catch (e) {
                    reject();
                }
            }, 5000);
            cancel = () => {
                clearInterval(interval);
                cancel = undefined;
            };
        });
    };

    let running = false;

    const start = () => {
        running = true;
        target.insertBefore(recording, target.firstChild);
        check(orderId)
            .then((status) => {
                label.textContent = "✅ " + status;
                stop();
                location.reload();
            })
            .catch((e) => {
                stop();
                label.textContent = 'Error during load: ' + e;
            });
    };

    const stop = () => {
        running = false;
        target.removeChild(recording);
        if (cancel) cancel();
    };

    const toggle = () => {
        running ? stop() : start();
    };

    appender.addEventListener('click', toggle);
    getOption('watchOrderStatus').then((watchOrderStatus) => {
        if (watchOrderStatus) {
            start();
        }
    })
})();