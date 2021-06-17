// NAME: AlbumReleaseDate
// AUTHOR: elijaholmos
// DESCRIPTION: Changes the album/ep/single release dates to display the exact date of release, if avaiable
// VERSION: 1.0.1

// Backdoor way of loading in Luxon CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/luxon@1.27.0/build/global/luxon.min.js';
document.head.appendChild(script);

(function AlbumReleaseDate() {
    // User: Change these values to modify extension behavior, be sure to run `spicetify apply` to apply changes
    const CONFIG = {
        // how to format album release dates, according to https://moment.github.io/luxon/docs/manual/formatting.html#table-of-tokens
        DATE_FORMAT: "DDD"  //default is 'localized date with full month', eg: 'January 1, 1970'
    };

    // -------- Begin code --------
    if(!Spicetify.CosmosAPI || !document.querySelector('#mount-album') || !luxon) {
        setTimeout(AlbumReleaseDate, 500);
        return;
    }
    const { DateTime } = luxon; //extract DateTime class from luxon library
    const VERSION = '1.0.1';    //extension version

    console.log(`Running AlbumReleaseDate v${VERSION}`);    //log current version for debugging purposes

    /**
     * Retrieve album metadata for a given album uri
     * @param {string} uri of type `spotify:album:xyz` 
     * @returns resolves to album metadata object, if found
     */
    const getAlbumInfo = function (uri) {
        return new Promise((resolve, reject) => {
            Spicetify.CosmosAPI.resolver.get(`hm://album/v1/album-app/album/${uri}/desktop?format=json`,
                (err, raw) => {
                    if (!!err) {
                        console.error(err);
                        return reject(err);
                    }
                    resolve(raw.getJSONBody());
                }
            );
        });
    };

    /**
     * Calls backend functions and modifies frontend after receiving results
     * @param {Node} el 
     * @returns {Promise<Node>} `el` passed when first called
     */
    const updateAlbumMetadata = function (el) {
        return new Promise(async (resolve, reject) => {
            if(!el) return reject('No element was passed into updateAlbumMetadata');
            //to prevent duplicate injection
            if(el.hasAttribute('data-injected-album-release'))
                return reject('Element already has attribute data-injected-album-release'); 

            const album_uri = el.querySelector('.AlbumHeader').getAttribute('data-ta-album-uri');
            if(!album_uri || !album_uri?.startsWith('spotify:album:')) return reject('Could not extract an album uri from .AlbumHeader');

            const album = await getAlbumInfo(album_uri);
            if(!album.month || !album.day) return resolve(el);  //some albums don't have days/months, DateTime will default those vals to Jan 1 if we don't return
            const formatted_date = DateTime.local(album.year, album.month, album.day).toFormat(CONFIG.DATE_FORMAT);

            //update html
            const new_html = el.querySelector('.AlbumMetaInfo').innerHTML.replace(album.year, formatted_date);
            el.querySelector('.AlbumMetaInfo').innerHTML = new_html;
            el.setAttribute('data-injected-album-release', 'true'); //to prevent duplicate injection
            return resolve(el);
        });
    };

    
    //watch for changes on the album page
    new MutationObserver(records => {
        const new_node = records.filter(r => !!r.addedNodes.length)?.pop()?.addedNodes[0];
        if(!new_node) return;
        new_node.parentElement.classList.remove('active');
        updateAlbumMetadata(new_node)
            .then(el => el.parentElement.classList.add('active'))
            .catch(err => {
                console.error(err);
                new_node.parentElement.classList.add('active');
            });
    }).observe(document.querySelector('#mount-album'), { childList: true });

    //on spotify load, if album page is active, replace its children with its children
    //this will trigger MutationObserver
    if(document.querySelector('#mount-album').classList.contains('active'))
        document.querySelector('#mount-album').replaceChildren(document.querySelector('#mount-album').firstChild);
})();
