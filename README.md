# Mangadex filter

Filters manga with certain tags and user-specified manga series at Mangadex [frontpage](https://mangadex.org/) and [recent updates listing](https://mangadex.org/updates).

## Installation

Get Violentmonkey or Greasemonkey browser extension from Google. Then click [here](https://github.com/nuiva/Mangadex-filter/raw/master/Mangadex-filter.user.js) to install.

## Usage

Go to Mangadex [search page](https://mangadex.org/search) to set the tag filters. The toggles are shown next to the included/excluded genres, and you must click the text *Filter* and not the checkbox. Green means not filtered, red means filtered.
Note that there is a 600 requests/10min limit on some Mangadex pages, and this script requests every manga that you have seen **for the first time**. Hence, refreshing all recent updates pages right after installation is not recommended, though no bans have been received yet.

For manual filtering, there are "Filter" buttons near the series name at the frontpage and updates page. You can unfilter series at their specific page.

You may view the script's cache by clicking *Mangadex filter* at the top right corner of the main page. Then click *List cache* to show the cache. Green means not filtered, yellow is filtered by tag, red is manually filtered. You may click on the rows to toggle the filter, or navigate to the manga's page by clicking the index on the left.
