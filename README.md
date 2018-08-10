# Mangadex filter

Filters yaoi-tagged and user-specified series at Mangadex [frontpage](https://mangadex.org/) and [recent updates listing](https://mangadex.org/updates).

## Installation

Get Violentmonkey or Greasemonkey browser extension from Google. Then click [here](https://github.com/nuiva/Mangadex-filter/raw/master/Mangadex-filter.user.js) to install.

## Usage

Go to Mangadex [search page](https://mangadex.org/search) to set the tag filters. The toggles are shown next to the included/excluded genres.

The tag filtering is capped at 1 checked manga every 1.1 seconds to avoid autoban. It is slow at first, but seen series are cached and not fetched again.

For manual filtering, there are "Filter" buttons near the series name. You can unfilter series at their specific page, e.g., https://mangadex.org/manga/11796

The script includes some tools for bulk filtering, but it's quite messy so I don't recommend looking into it.
