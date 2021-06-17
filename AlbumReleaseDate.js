// NAME: AlbumReleaseDate
// AUTHOR: elijaholmos
// DESCRIPTION: Changes the album/ep/single release dates to display the exact date of release, if avaiable
// VERSION: 1.0.0

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
    if(!Spicetify.CosmosAPI || document.readyState !== 'complete' || !luxon) {
        setTimeout(AlbumReleaseDate, 500);
        return;
    }
    const { DateTime } = luxon; //extract DateTime class from luxon library
    const VERSION = '1.0.0';    //extension version

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

    // Calls backend functions and modifies frontend after receiving results
    const updateAlbumMetadata = async function () {
        const el = document.querySelector("#mount-album");
        if(!el?.classList?.contains('active')) return;

        const album_uri = el.querySelector('.AlbumHeader').getAttribute('data-ta-album-uri');
        if(!album_uri || !album_uri?.startsWith('spotify:album:')) return;

        const album = await getAlbumInfo(album_uri);
        if(!album.month || !album.day) return;  //some albums don't have days/months, DateTime will default those vals to Jan 1 if we don't return
        const formatted_date = DateTime.local(album.year, album.month, album.day).toFormat(CONFIG.DATE_FORMAT);

        const new_html = el.querySelector('.AlbumMetaInfo').innerHTML.replace(album.year, formatted_date);
        el.querySelector('.AlbumMetaInfo').innerHTML = new_html;
        return;
    };

    window.addEventListener('message', (msg) => {
        if(msg?.data?.type !== 'notify_loaded') return;
        if(msg.data.pageId !== 'album') return;

        updateAlbumMetadata();
    });
})();
