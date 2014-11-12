/**
 * Nicer tooltip V1-Alpha.
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

    function setTooltipText( element, tooltipElement ) {
        if ( element.attr( "data-tooltip-text" ) ) {
            tooltipElement.text( element.attr( "data-tooltip-text" ) );
        }
        if ( element.attr( "data-tooltip-html" ) ) {
            tooltipElement.html( element.attr( "data-tooltip-html" ) );
        }
        return null;
    }

    function displayTooltip() {
        clearTooltip();
        if ( currentElement.length > 0 ) {
            tooltipElement = $( "<div>" ).addClass( "tooltip" ).css( "display", "inline-block" ).css( "position", "absolute" ).css( "top", tooltipY + 10 ).css( "left", tooltipX );
            setTooltipText( currentElement, tooltipElement );
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


    function trackElement( target, x, y ) {
        target = getTooltipElement( target );
        if ( currentElement.length != target.length || ( currentElement.length == 1 && target.length == 1 && currentElement.get( 0 ) !== target.get( 0 ) ) ) {
            console.info( "Target changed to " + target );
            currentElement = target;

            // Clear the timeout
            clearDisplayTimeout();
            clearTooltip();

            // Start a new timeout
            displayTimeout = setTimeout( displayTooltip, conf.displayDelay );
        }

        tooltipX = x;
        tooltipY = y;

    }

    function trackMouseMove( event ) {
        rootElement.addClass( "tooltip-probe" );
        var target = $( document.elementFromPoint( event.clientX, event.clientY ) );
        rootElement.removeClass( "tooltip-probe" );

        trackElement( target, event.clientX, event.clientY );
    }

    function configure( _conf ) {
        conf = $.extend( {
            frameClass: "tooltip",
            displayDelay: 500,
            contexts: {}
        }, _conf );
    }

    var install = function ( _conf, _rootElement ) {
        configure( _conf );

        rootElement = _rootElement ? _rootElement : $( 'html' );

        rootElement.on( "mousemove", trackMouseMove );
        rootElement.on( "mouseleave", function ( event ) {
            trackElement( $( null ), event.clientX, event.clientY );
        } );

        console.info( "Nicer tooltips installed." );
    }
    install.configure = configure;

    $.nicerTooltip = install;
})( jQuery );