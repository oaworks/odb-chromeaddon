// fixme: there are the URLs still valid for the Open Data Button?
// fixme: what information is relevant for repositories / collections? (to replace metadata)

var current_page = location.pathname;
var key = localStorage.getItem('api_key');

// These listeners are active on all pages
window.addEventListener('load', function () {
    document.getElementById('bug').addEventListener('click', function () {
        chrome.tabs.create({'url': "http:/openaccessbutton.org/chrome/bug"});
    });
    document.getElementById('help').addEventListener('click', function () {
        chrome.tabs.create({'url': "http:/openaccessbutton.org/chrome/help"});
    });
    document.getElementById('privacy').addEventListener('click', function () {
        if (current_page == '/ui/login.html') {
            chrome.tabs.create({'url': "http://openaccessbutton.org/privacy"});
        } else {
            chrome.tabs.create({'url': "http://openaccessbutton.org/user/" + localStorage.getItem('username')});
        }
    });
    document.getElementById('logout').addEventListener('click', function () {
        if ('api_key' in localStorage) localStorage.removeItem('api_key');
        window.location.href = 'login.html';
    });
});

// Helpers
function get_id(id) {
    return document.getElementById(id);
}
function get_value(id) {
    return document.getElementById(id).value;
}
function get_loc(callback) {
    if (navigator.geolocation) {
        var opts = {timeout: 10000};        // 10 sec timeout
        navigator.geolocation.getCurrentPosition(function (position) {
            var lat_lon = {geo: {lat: position.coords.latitude, lon: position.coords.longitude}};
            callback(lat_lon)
        }, function () {
            // Can't get location (permission denied or timed out)
            callback(null)
        }, opts);
    } else {
        // Browser does not support location
        callback(null)
    }
}

function display_error(warning) {
    var warn_div = get_id('error');
    warn_div.innerHTML = '<div class="alert alert-danger" role="alert">' + warning + '</div>';
}

function store_article_info(title, doi, author, journal) {
    localStorage.setItem('title', title);
    localStorage.setItem('doi', doi);
    localStorage.setItem('author', author);
    localStorage.setItem('journal', journal);
}

function prefill_email_fields(article_title, author_email) {

}

function handle_data(data) {
    var api_div = get_id('api_content');
    var blocked = data.blocked;
    var wishlist = data.wishlist;

    if (data.hasOwnProperty('provided')) {
        // show url
    } else if (data.hasOwnProperty('request')) {
        // submit user story and redirect to request URL
        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                var doc = (new DOMParser()).parseFromString(request.content, "text/html");
                var meta = doc.getElementsByTagName('meta');
                var title = oab.return_title(meta);
                var doi = oab.return_doi(meta);
                var author = oab.return_authors(meta);
                var journal = oab.return_journal(meta);
                store_article_info(title, doi, author, journal);

                var block_request = '/blocked/' + localStorage.getItem('blocked_id');
                var data = {             // This is best-case (assume getting all info) for now.
                    'api_key': key,
                    'url': localStorage.getItem('active_tab'),
                    'metadata': {
                        'title': title,
                        'author': author,
                        'journal': journal,
                        'identifier': [{'type': 'doi', 'id': doi}]
                    }
                };
                oab.api_request(block_request, data, 'blockpost', process_api_response, handle_api_error);

                if (title) {
                    api_div.innerHTML = '<h5 class="title-emph">' + title + '</h5><h5>Links</h5><p><a target="_blank" href="http://scholar.google.co.uk/scholar?hl=en&q=' + encodeURI(title) + '">Google Scholar</a></p><h5>Related papers</h5><p>No results available.</p><h5>Additional info</h5><ul><li>Blocked:' + blocked + '</li>' + '<li>Wishlist: ' + wishlist + '</li></ul>';
                } else {
                    api_div.innerHTML = '<div class="alert alert-danger" role="alert"><p><strong>Error</strong> Are you sure this is an article page?</p>';
                }
            });

        var tab_id = parseInt(localStorage.getItem('tab_id'), 10);
        // Now inject a script onto the page
        chrome.tabs.executeScript(tab_id, {
            code: "chrome.runtime.sendMessage({content: document.head.innerHTML}, function(response) { console.log('success'); });"
        }, function () {
            console.log('done');
        });
    } else {
        // submit user story with email and title fields
    }
}

function handle_api_error(data) {
    var error_text = '';
    if (data.hasOwnProperty('responseJSON') && data.responseJSON.hasOwnProperty('errors')) {
        if (data.responseJSON['errors'][0] == '401: Unauthorized') {
            error_text = 'Incorrect password.';
        } else if (data.responseJSON['errors'][0] == '404: Not Found') {
            error_text = 'Email address does not have an account.';
        } else if (data.responseJSON['errors'][0] == 'username already exists') {
            error_text = 'Email address already associated with an account.';
        }
    }
    if (error_text != '') {
        display_error(error_text);
    }
}

function post_block_event(blockid, callback) {
    var story_text = get_value('story');
    var block_request = '/blocked/' + blockid;
    var data = {
        api_key: key,
        url: localStorage.getItem('active_tab'),
        story: story_text
    };
    // Add author email if provided so oabutton can email them //todo: parse from page & populate field
    var given_auth_email = get_value('auth_email');
    if (given_auth_email) {
        data['email'] = [given_auth_email]
    }

    // Add location data to story if possible
    get_loc(function (pos_obj) {
        if (pos_obj) {
            data['location'] = pos_obj;
        }
        oab.api_request(block_request, data, 'blockpost', process_api_response, handle_api_error);
        callback()
    });
}

function process_api_response(data, requestor) {
    if (requestor == 'accounts') {
        localStorage.setItem('api_key', data.api_key);
        localStorage.setItem('username', get_value('user_email'));
        window.location.href = 'login.html'
    } else if (requestor == 'blocked') {
        localStorage.setItem('blocked_id', data.id);
        handle_data(data);
    }
}

if (current_page == '/ui/login.html') {
    window.addEventListener('load', function () {

        // If we have a key, redirect to the main page.
        if (key) {
            window.location.href = '/ui/main.html';
        }

        document.getElementById('terms').addEventListener('click', function () {
            chrome.tabs.create({'url': "http:/openaccessbutton.org/terms"});
        });

        // Handle the register button.
        document.getElementById('signup').addEventListener('click', function () {
            var user_email = get_value('user_email');
            var user_name = get_value('user_name');
            var user_prof = get_value('user_prof');
            var privacy = get_id('privacy_c');
            var terms = get_id('terms_c');

            if (user_email && user_name && user_prof && privacy.checked && terms.checked) {
                var api_request = '/register';
                data = {
                    'email': user_email,
                    'username': user_name,
                    'profession': user_prof
                };
                oab.api_request(api_request, data, 'accounts', process_api_response, handle_api_error);
            } else {
                display_error('You must supply an email address, username and profession to register. You must also agree to our privacy policy and terms by checking the boxes.');
            }
        });

        // Handle the login button.
        document.getElementById('login').addEventListener('click', function () {
            var user_email = get_value('user_email');

            if (user_email) {
                var api_request = '/register';
                data = {
                    'email': user_email,
                };
                oab.api_request(api_request, data, 'accounts', process_api_response, handle_api_error);
            } else {
                display_error('error', 'You must supply an email address and a password to login or register.');
            }
        });
    });

} else if (current_page == '/ui/main.html' && key) {
    window.addEventListener('load', function () {
        document.getElementById('spin-greybox').style.visibility = 'hidden';

        //$('#auth_email').collapse('show');
        //$('#article_title').collapse('show');
        /*
        document.getElementById('email_auth_check').addEventListener('change', function () {
            if (this.checked){
                $('#auth_email').collapse('show')
            } else {
                $('#auth_email').collapse('hide')
            }
        });*/

        document.getElementById('submit').addEventListener('click', function () {
            document.getElementById('spin-greybox').style.visibility = 'visible';
            post_block_event(localStorage.getItem('blocked_id'), function () {
                window.close();
            });
        });

        document.getElementById('why').addEventListener('click', function () {
            chrome.tabs.create({'url': "http://openaccessbutton.org/chrome/why"});
        });

        if (!localStorage.getItem('blocked_id')) {
            // Blocked Event, if we've not already sent a block event.
            var blocked_request = '/blocked';
            status_data = {
                'api_key': key,
                'url': localStorage.getItem('active_tab')
            },
                oab.api_request(blocked_request, status_data, 'blocked', process_api_response, handle_api_error);
        }

        $('#story').keyup(function () {
            var left = 85 - $(this).val().length;
            if (left < 0) {
                left = 0;
            }
            $('#counter').text(left);
            var failure = get_id('success');
            if (left < 85) {
                failure.disabled = false;
            } else {
                failure.disabled = true;
            }
        });
    });

} else {
    window.location.href = 'login.html';
}
