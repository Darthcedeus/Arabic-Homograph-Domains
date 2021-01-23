let fetchData_btn = document.getElementById('fetchData');
let results = document.getElementById('results');

fetch_results();

fetchData_btn.onclick = function (element) {
    fetch_results();
    console.log('here');

};


function fetch_results(){
    chrome.storage.local.get(['existingHomographs'], function (result) {
        domains = result.existingHomographs;
        html = '</br> <table width=100%> <tr> <th>Punycode</th> <th>Unicode</th> </tr>';
        console.log(domains);
        for(dom in domains){
            html = html + '<tr> <td>' + dom + '</td><td>' + domains[dom] + '</td></tr>';
        }
        html = html + '</table> </br>';
        results.innerHTML = html;
    });
}

setTimeout(function() { fetch_results(); }, 2000);