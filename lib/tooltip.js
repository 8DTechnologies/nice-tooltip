/**
 * Nicer tooltip V1.
 *
 * The initial goals of this librairy:
 *    - Make standard tooltips look and behave nicer.
 *    - Provide plugins api to allow adding functionalities like having rich tooltips, integrate with Textile, etc.
 *
 * The non-goals:
 *    - Support old browsers.
 *
 */
(function ( $ ) {
    "use strict"

    var conf;
    var rootElement;
    var currentElement = $( null );
    var currentContent = getTooltipContent( null );
    var updateInterval = null;
    var displayTimeout = null;
    var tooltipX = 0;
    var tooltipY = 0;
    var tooltipElement = null;

    function clearDisplayTimeout() {
        if ( displayTimeout ) {
            clearTimeout( displayTimeout );
        }
        displayTimeout = null;
    }

    function clearTooltip() {
        if ( tooltipElement ) {
            tooltipElement.remove();
            tooltipElement = null;
        }
    }

    function getTooltipContent( element ) {
        var result = {text: null, html: null, content: null};
        if ( element && element.length > 0 ) {
            result.content = element.attr( "data-tooltip-text" );
            if ( result.content ) {
                result.text = result.content;
            } else {
                result.content = element.attr( "data-tooltip-html" );
                if ( result.content ) {
                    result.html = result.content;
                } else {
                    result.content = null;
                }
            }
        }
        return result;
    }

    function displayTooltip() {
        clearTooltip();
        if ( currentElement.length > 0 && currentContent.content ) {
            tooltipElement = $( "<div>" ).addClass( "tooltip" ).css( "display", "inline-block" ).css( "position", "absolute" ).css( "top", tooltipY + 10 ).css( "left", tooltipX );
            if ( currentContent.text ) {
                tooltipElement.text( currentContent.text );
            } else if ( currentContent.html ) {
                tooltipElement.html( currentContent.html );
            }
            rootElement.append( tooltipElement );
        }
    }

    function getTooltipElement( target ) {
        while ( target.length > 0 ) {

            // Remove title asap so it does not show as native tooltip.
            var title = target.attr( "title" );
            if ( title ) {
                target.removeAttr( "title" );
                target.removeAttr( "data-tooltip-text" );
                target.removeAttr( "data-tooltip-html" );
                if ( conf.titleToHtmlProcessor ) {
                    target.attr( "data-tooltip-html", conf.titleToHtmlProcessor( title ) );
                } else if ( conf.titleProcessor ) {
                    target.attr( "data-tooltip-text", conf.titleProcessor( title ) );
                } else {
                    target.attr( "data-tooltip-text", title );
                }
                return target;
            }
            // Do we have already processed text ?
            if ( target.attr( "data-tooltip-text" ) || target.attr( "data-tooltip-html" ) ) {
                return target;
            } else {
                target = target.parent();
            }
        }
        return $( null );
    }


    function checkElementState( element, x, y ) {

        var target = getTooltipElement( element );
        if ( currentElement.length != target.length || ( currentElement.length == 1 && target.length == 1  ) ) {
            if ( currentElement.get( 0 ) !== target.get( 0 ) ) {
                console.info( "Target changed to " + target );
                currentElement = target;
                currentContent = getTooltipContent( currentElement );

                // Clear the timeout
                clearDisplayTimeout();
                clearTooltip();

                // Start a new timeout
                displayTimeout = setTimeout( displayTooltip, conf.displayDelay );
            } else {
                var actualContent = getTooltipContent( currentElement );
                if ( actualContent.content !== currentContent.content ) {
                    currentContent = actualContent;
                    // Update the tooltip if it is displayed.
                    if ( tooltipElement ) {
                        displayTooltip();
                    }
                }

            }
        }

        tooltipX = x;
        tooltipY = y;

    }

    function trackElementAt( x, y ) {
        rootElement.addClass( "tooltip-probe" );
        var target = $( document.elementFromPoint( x, y ) );
        rootElement.removeClass( "tooltip-probe" );
        checkElementState( target, x, y );
    }

    function trackUpdates() {
        if ( tooltipX || tooltipY ) {
            trackElementAt( tooltipX, tooltipY );
        }
    }

    function trackMouseMove( event ) {
        trackElementAt( event.clientX, event.clientY );
    }

    function configure( _conf ) {
        conf = $.extend( {
            frameClass: "tooltip", displayDelay: 500, contexts: {}, dynamicUpdateInterval: 250,
        }, _conf );

        if ( conf.dynamicUpdateInterval ) {
            updateInterval = setInterval( trackUpdates, conf.dynamicUpdateInterval );
        } else if ( updateInterval ) {
            clearInterval( updateInterval );
            updateInterval = null;
        }
    }

    var install = function ( _conf, _rootElement ) {
        rootElement = _rootElement ? _rootElement : $( 'html' );

        configure( _conf );

        rootElement.on( "mousemove", trackMouseMove );
        rootElement.on( "mouseleave", trackMouseMove );

        console.info( "Nicer tooltips installed." );
    }
    install.configure = configure;

    $.nicerTooltip = install;
})( jQuery );