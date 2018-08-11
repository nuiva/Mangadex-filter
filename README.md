# Mangadex filter

Filters manga with certain tags and user-specified manga series at Mangadex [frontpage](https://mangadex.org/) and [recent updates listing](https://mangadex.org/updates).

## Installation

Get Violentmonkey or Greasemonkey browser extension from Google. Then click [here](https://github.com/nuiva/Mangadex-filter/raw/master/Mangadex-filter.user.js) to install.

## Usage

### Filtering by tag

You may filter tags in two ways:

1. Go to Mangadex [search page](https://mangadex.org/search). Click on the *Filtered* text buttons to filter a tag. Green means not filtered, red means filtered.

2. Click *Mangadex filter* at the upper right corner of the [frontpage](https://mangadex.org/) and then click *Show tags*. Click on a tag row to filter. Green means not filtered, yellow means filtered.

### Filtering single series

There are *Filter* buttons near each series title at the [frontpage](https://mangadex.org/) and [updates page](https://mangadex.org/updates). In addition, there is a *Filter* button next to the manga title in the series' specific page.

You may unfilter manga in two ways:

1. Go to the series' page and click *Unfilter* next to the title.

2. Click *Mangadex filter* at the upper right corner of the [frontpage](https://mangadex.org/) and then click *List cache*. Click on a row to toggle filter. Green means not filtered, yellow is filtered by tag, red means manually filtered.

### Scope

This script only affects the latest updates view on the [frontpage](https://mangadex.org/) and the [updates page](https://mangadex.org/updates). Top chapters lists, follows, searches and other lists are not filtered.

Note that there is a 600 requests/10min limit on some Mangadex pages, and this script requests every manga that you have seen **for the first time**. Hence, refreshing all recent updates pages right after installation is not recommended, though no bans have been received yet.
