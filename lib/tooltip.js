/**
 * Nicer tooltip V1-Beta.
 *
 * The initial goals of this library:
 *    - Make standard tooltips look and behave nicer.
 *    - Provide plugins api to allow adding functions like having rich tooltips, integrate with Textile, etc.
 *
 * The non-goals:
 *    - Support old browsers.
 *
 */
(function ( $ ) {
    "use strict";

    var conf;
    var rootElement;
    var currentElement = $( null );
    var currentContent = getTooltipContent( null );
    var updateInterval = null;
    var displayTimeout = null;
    var tooltipX = 0;
    var tooltipY = 0;
    var tooltipElement = null;
    var delayedTracking = null;
    var observeMode = false;
    var observer;

    /**
     * Read a parameter value from the DOM tree.
     */
    function getParameterValue( element, paramName, defaultValue ) {
        var valueFound = element.attr( paramName );
        if ( typeof valueFound === "undefined" ) {
            valueFound = element.parents('[' + paramName + ']:first' );
            valueFound = valueFound.length > 0 ? valueFound.attr( paramName ) : undefined;
        }
        return (typeof valueFound === "undefined" ) ? defaultValue : valueFound;
    }

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

    /**
     * Simple positioning strategy.
     */
    function basicPositioning( tooltipElement ) {
        var width = tooltipElement.width();
        var height = tooltipElement.height();

        var finalX = ( tooltipX + width + conf.deltaX > $( window ).width() && tooltipX > width + conf.deltaX ) ? tooltipX - width - conf.deltaX : tooltipX + conf.deltaX;
        var finalY = ( tooltipY + height + conf.deltaY > $( window ).height() ) ? tooltipY - height - conf.deltaY : tooltipY + conf.deltaY;
        tooltipElement.css( {
            left: finalX,
            top: finalY
        } );
    }

    /**
     * This will display the tooltip.
     */
    function displayTooltip() {
        clearTooltip();
        if ( currentElement.length > 0 && currentContent.content ) {
            tooltipElement = $( "<div>" ).addClass( "tooltip" ).css( {
                display: "inline-block",
                position: "fixed",
                top: "0",
                left: "0"
            } );
            if ( currentContent.text ) {
                tooltipElement.text( currentContent.text );
            } else if ( currentContent.html ) {
                tooltipElement.html( currentContent.html );
            }
            rootElement.append( tooltipElement );

            basicPositioning( tooltipElement );
        }
    }

    /**
     * This will hide the tooltip (not delete it).
     */
    function hideTooltip() {
        if ( tooltipElement ) {
            tooltipElement.css( "display", "none" );
        }
    }

    /**
     * Transform title attributes to it's html or text counterpart.
     */
    function processTooltipTitle( target ) {
        // Remove title asap so it does not show as native tooltip.
        var tagName = target.get( 0 ).tagName;
        var title = target.attr( "title" );
        if ( !title && "g rect circle".indexOf( tagName ) >= 0 ) {
            var svgTitle = target.children( 'title' );
            if ( svgTitle && svgTitle.text() ) {
                title = svgTitle.text();
                svgTitle.empty();
            }
        }
        if ( title ) {
            target.removeAttr( "title" );
            target.removeAttr( "data-tooltip-text" );
            target.removeAttr( "data-tooltip-html" );
            var titleFormat = getParameterValue( target, "data-tooltip-title-format", "text" );

            switch ( titleFormat ) {
                case "html":
                    target.attr( "data-tooltip-html", title );
                    break;
                default:
                    if ( conf.titleToHtmlProcessor ) {
                        target.attr( "data-tooltip-html", conf.titleToHtmlProcessor( title, target ) );
                    } else if ( conf.titleProcessor ) {
                        target.attr( "data-tooltip-text", conf.titleProcessor( title, target ) );
                    } else {
                        target.attr( "data-tooltip-text", title );
                    }
            }
        }
    }

    /**
     * @returns True if target has tooltip meta-data.
     */
    function hasTooltipData( target ) {
        return target.attr( "data-tooltip-text" ) || target.attr( "data-tooltip-html" )
    }

    /**
     * Go down the tree and do 2 things:
     * 1 - Find the first element that has a tooltip, keep it for result.
     * 2 - If not in observe mode:
     *     - Process the tooltip meta-data JIT.
     *     - Process underlying elements to prevent native tooltip to pop-up over our tooltip once we removed the title.
     */
    function getTooltipElement( target ) {
        var result;
        while ( target.length > 0 && target.get( 0 ) !== rootElement.get( 0 ) ) {

            // Process the tooltip
            if ( !observeMode ) {
                processTooltipTitle( target );
            }

            // Do we have already processed text ?
            if ( !result && hasTooltipData( target ) ) {
                result = target;
            }

            if ( result && observeMode ) {
                break;
            } else {
                target = target.parent();
            }
        }
        return result ? result : $( null );
    }

    /**
     * Pick the element in DOM @ X, Y and update the tooltip state according to data found.
     */
    function updateTooltipState( x, y ) {

        rootElement.addClass( "tooltip-probe" );
        var element = $( document.elementFromPoint( x, y ) );
        rootElement.removeClass( "tooltip-probe" );


        var target = getTooltipElement( element );
        if ( currentElement.length != target.length || ( currentElement.length == 1 && target.length == 1  ) ) {
            if ( currentElement.get( 0 ) !== target.get( 0 ) ) {
                currentElement = target;
                currentContent = getTooltipContent( currentElement );

                // Clear the timeout
                clearDisplayTimeout();
                clearTooltip();

                // Start a new timeout
                var displayDelay = new Number( getParameterValue( currentElement, "data-tooltip-timeout", conf.displayDelay ) );
                if ( displayDelay > 0 ) {
                      displayTimeout = setTimeout( displayTooltip, displayDelay.valueOf() );
                } else {
                      displayTooltip();
                }
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

    /**
     * Track updates from the previously known mouse position.
     */
    function trackUpdates() {
        if ( delayedTracking ) {
            window.clearTimeout( delayedTracking );
            delayedTracking = null;
        }

        if ( tooltipX || tooltipY ) {
            updateTooltipState( tooltipX, tooltipY );
        }
    }

    /**
     * Track from mouse move.
     */
    function trackMouseMove( event ) {
        updateTooltipState( event.clientX, event.clientY );
    }

    // Process the dom to track titles.
    // This function is throttled and will only update the DOM  with a time of 100ms between update.
    function processDOM( target ) {
        target.find( '[title]' ).each( function ( idx, itm ) {
            processTooltipTitle( $( itm ) );
        } );

        target.find( 'title' ).each( function ( idx, itm ) {
            processTooltipTitle( $( itm ).parent() );
        } );

    }

    function startObserve() {
        observer.observe( rootElement.get(0), { attributes: true, childList: true, subtree: true, attributeFilter: ["title"] } );
    }

    function stopObserve() {
        observer.disconnect();
    }

    // If browser support mutation observers...
    if ( window.MutationObserver ) {
        observeMode = true;

        // Observe changes to title.
        observer = new MutationObserver( function( items ) {
            stopObserve()
            try {
                if ( items.length < 10 ) {
                    items.forEach( function ( mutation ) {
                        if ( mutation.type === "attributes" ) {
                            processTooltipTitle( $( mutation.target ) );
                        } else if ( mutation.type === "childList" ) {
                            processDOM( $( mutation.target ) );
                        }
                    } );
                } else {
                    processDOM( rootElement );
                }
                if ( delayedTracking ) {
                    clearTimeout( delayedTracking );
                }
                delayedTracking = setTimeout( trackUpdates, 250 );
            } finally {
                startObserve();
            }
        });

    }


    var install = function ( _conf, _rootElement ) {
        conf = $.extend( {
            frameClass: "tooltip",
            displayDelay: 500,
            deltaX: 15,
            deltaY: 15,
            contexts: {}
        }, _conf );

        rootElement = _rootElement ? _rootElement : $( 'html' );

        rootElement.on( "mousemove", trackMouseMove );
        rootElement.on( "mousedown", hideTooltip );
        rootElement.on( "keydown", hideTooltip );
        rootElement.on( "mouseleave", trackMouseMove );

        // Start the observers
        if ( observeMode ) {

            processDOM( rootElement );
            startObserve();

        } else  if ( !observeMode ) {
            updateInterval = setInterval( trackUpdates, 250 );
        }

        console.info( "Nicer tooltips installed." );
    }

    $.nicerTooltip = install;
})( jQuery );