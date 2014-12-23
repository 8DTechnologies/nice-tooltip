nice-tooltip
============

Simple drop-in replacement to get nicer tooltips on web page.

This library have the following features:

* Works with disabled input.
* Support plugin to pre-process title before display. (Example, you want to have textile tooltips)
* Support rendering html tooltip.
* Support dynamic modifications of the DOM.

This library have the following limitations:
* Only been tested with IE10+, Chrome, Firefox and Safari. I do not expect to test it with IE9 but feel free to do it !

Usage:
======
<code>
    $( function() {
        $.nicerTooltip();
    });
</code>