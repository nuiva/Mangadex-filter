# Mangadex filter

** This script is largely obsolete since Mangadex introduced genre filtering. **

This is a browser userscript that allows manga filtering at Mangadex. Series may be filtered by
* tags,
* original language,
* filtering each individually.

Filtered manga are hidden in the latest updates view on the [frontpage](https://mangadex.org/) and the [updates page](https://mangadex.org/updates). Top chapters lists, follows, searches and other lists are not filtered.

## Installation

Get Violentmonkey or Greasemonkey browser extension from Google. Then click [here](https://github.com/nuiva/Mangadex-filter/raw/master/Mangadex-filter.user.js) to install.

## Usage

### Filtering by tag

Click *Mangadex filter* at the upper right corner of the [frontpage](https://mangadex.org/) and then click *Show tags*. Click on a tag row to filter. Green means not filtered, yellow means filtered.

### Filtering by language

Find a manga with the original language you wish to filter. Navigate to the series' page and hover over the country flag next to the title. It says something like "Japanese" or "Chinese (Simp)".
Click *Mangadex filter* at the upper right corner of the [frontpage](https://mangadex.org/) and then click *Languages*. Write the language you found earlier into the textbox and click *Filter*.

### Filtering single series

There are *Filter* buttons near each series title at the [frontpage](https://mangadex.org/) and [updates page](https://mangadex.org/updates). In addition, there is a *Filter* button next to the manga title in the series' specific page.

You may unfilter manga in two ways:

1. Go to the series' page and click *Unfilter* next to the title.

2. Click *Mangadex filter* at the upper right corner of the [frontpage](https://mangadex.org/) and then click *List cache*. Click on a row to toggle filter. Green means not filtered, yellow is filtered by tag, red means manually filtered.
