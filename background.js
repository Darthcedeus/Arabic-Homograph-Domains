chrome.runtime.onInstalled.addListener(function () {

    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { urlMatches: 'xn--' },
            })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });

});

chrome.webNavigation.onCommitted.addListener(function () {

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        url = tabs[0].url; //get url
        domain = extractDomain(url); //extract domain from url
        domain_ = punycode.ToUnicode(domain);
        domain_ = domain_.split("."); //seperate tld
        if (isArabic(domain_[0])) { //generate homographs if domain has arabic character
            homograph_domains = generateHomographs(domain_[0]);
            console.log(homograph_domains);
            domainExists(homograph_domains, domain_[1]);
            // console.log(existingHomographs);
        }
    });

});


function extractDomain(url) {
    url = url.substring(url.indexOf("//") + 2,) //remove protocol
    url = url.split('/')[0]; //remove trainling url from hostname
    url = url.split(":")[0] //remove ports, if any
    url = url.split(".");
    url = url[url.length - 2] + "." + url[url.length - 1]
    return url;
}

function isArabic(text) {
    var pattern = /[\u0600-\u06FF\u0750-\u077F]/;
    result = pattern.test(text);
    return result;
}

function expandMapings() {
    maping = {
        "0649": ["06CC", "06CD", "0626", "0678", "063D", "06CE", "0620", "06D0", "06D1", "064A", "063E", "063F"], //ى
        "0627": ["0661", "06F1", "0673", "0625", "0675", "0672", "0623", "0622", "0671"], //ا
        "060F": ["0639", "063A", "06AO", "06FC"], // ؏         
        "0628": ["067B", "0680", "067E", "067A", "067D", "062B", "067F", "067C", "062A"], //ب
        "0624": ["0676", "0648", "06C5", "06C4", "06CF", "06CB", "06C7", "0677", "06C9", "06C6", "06C8", "06CA"], //ؤ
        "062F": ["068A", "0689", "068D", "068B", "0688", "0691", "0690", "068F", "068E", "068C", "06EE", "0630"], //د
        "0631": ["0693", "0695", "0694", "0696", "0632", "0697", "0698", "0699", "0692", "06EF"], //ر
        "062E": ["0682", "0681", "062D", "0685", "062C", "0683", "0684", "06BF", "0686", "0687"], //خ
        "0647": ["06C1", "06D5", "0665", "06C0", "06C2", "0629", "06C3"], //ه
        "0637": ["0638", "069F"], //ط
        "0636": ["069E", "06FB", "0635", "069D"], //ض
        "0633": ["069B", "069A", "069C", "06FA", "0634"], //س
        "0646": ["06B9", "06BC", "06BB", "06BA", "06BD"], //ن
        "0644": ["06B7", "06B6", "06B5", "06B8"], //ل
        "0643": ["06AE", "06AD", "06AC", "063C", "06AB", "06A9", "063B"], //ك
        "0641": ["06A6", "06A4", "06A1", "06A5", "06A2", "066F", "06A7", "0642", "06A8", "06A3"], //ف
        "06AF": ["06B0", "06B4", "06B3", "06B2", "06B1"], //گ
        "06D2": ["06D3"] //ے
    };


    dict = {};
    for (key in maping) {
        dict[key] = maping[key].slice(); //add orignal row
        for (i = 0; i < maping[key].length; i++) { //create more mapping for selected key, by exchanging key with position char.
            temp = [];
            temp = maping[key].slice();
            key_new = temp[i];
            temp[i] = key;
            dict[key_new] = temp;
        }
    }
    return dict;
}

function generateHomographs(domain) {
    char_mapings = expandMapings();
    homograph_domains = [domain];

    domain = domain.split('');

    for (i = 0; i < domain.length; i++) { //iterate over each char and generate homographs
        char = domain[i];
        char_code = char.charCodeAt(0).toString(16); //get unicode of char
        if (char_code.length < 4) { //ensure unicode is of length 4, if not then pad with 0
            char_code = "0000" + char_code;
            char_code = char_code.slice(-4);
        }
        char_code = char_code.toUpperCase();
        if (typeof char_mapings[char_code] == 'undefined') { //continue if maping does not exist for selected char
            continue;
        }
        for (homograph_ch of char_mapings[char_code]) {
            //get homographs for selected character
            //replace selected char with homograph and append to list
            ch = String.fromCharCode(parseInt(homograph_ch, 16));
            temp = domain.slice();
            temp[i] = ch;
            homograph_domains.push(temp.join(''));
        }
    }

    return homograph_domains;
}

async function domainExists(domains, tld) {
    existingHomographs = [];
    chrome.storage.local.set({ existingHomographs: existingHomographs });

    for (domain of domains) {
        domain_punycode = punycode.encode(domain);

        await fetch('https://dns.google/resolve?name=xn--' + domain_punycode + '.' + tld)
            .then(response => response.json())
            .then(data => {
                //console.log(data);
                if (data['Status'] == 0) {
                    chrome.storage.local.get(['existingHomographs'], function (result) {
                        val = [data['Question'][0].name, punycode.ToUnicode(data['Question'][0].name)];
                        result.existingHomographs.push(val);
                        chrome.storage.local.set({ existingHomographs: result.existingHomographs });
                    });
                }
            });
    }
}
