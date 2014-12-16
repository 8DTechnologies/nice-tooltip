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
    var modifying = false;
    var observeMode = false;
    var attributeObserver;
    var domChangeObserver;

    // Retrieve parameter value
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

    function hideTooltip() {
        if ( tooltipElement ) {
            tooltipElement.css( "display", "none" );
        }
    }

    /**
     * Transform title attributes to it's html or text counterpart.
     */
    function processTooltipTitle( target ) {
        modifying = true;
        try {

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
        } finally {
            modifying = false;
        }
    }

    /**
     * Go down the tree and do 2 things:
     * 1 - pick the first that is tooltip-ed.
     * 2 - Process any other parent to prevent a browser tooltip to overlay our nice tooltip.
     * @param target
     * @returns {*}
     */
    function getTooltipElement( target ) {
        var result;
        while ( target.length > 0 && target.get( 0 ) !== rootElement.get( 0 ) ) {

            // Process the tooltip
            if ( !observeMode ) {
                processTooltipTitle( target );
            }

            // Do we have already processed text ?
            if ( !result && ( target.attr( "data-tooltip-text" ) || target.attr( "data-tooltip-html" ) ) ) {
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


    function checkElementState( element, x, y ) {

        var target = getTooltipElement( element );
        if ( currentElement.length != target.length || ( currentElement.length == 1 && target.length == 1  ) ) {
            if ( currentElement.get( 0 ) !== target.get( 0 ) ) {
                console.log( "Target changed to " + target );
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

    function installToDom( target ) {
        modifying = true;
        try {
            target.find('[title]').each( function( idx, itm ) {
                processTooltipTitle( $(itm) );
            });

            target.find('title').each( function( idx, itm ) {
                processTooltipTitle( $(itm ).parent() );
            });
        } finally {
            modifying = false;
        }

    }

    // If browser support mutation observers...
    if ( window.MutationObserver ) {
        observeMode = true;

        // Observe changes to title.
        attributeObserver = new MutationObserver( function( items ) {
            if ( !modifying ) {
                items.forEach( function ( mutation ) {
                    processTooltipTitle( $(mutation.target ) );
                } );
                trackUpdates();
            }
        });

        // Observe changes to DOM (SVG)
        domChangeObserver = new MutationObserver( function( items ) {
            if ( !modifying ) {
                items.forEach( function ( mutation ) {
                    installToDom( $(mutation.target ) );
                } );
                trackUpdates();
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

        if ( observeMode ) {

            installToDom( rootElement );
            attributeObserver.observe( rootElement.get(0), { attributes: true, childList: false, subtree: true, attributeFilter: ["title"] } );
            domChangeObserver.observe( rootElement.get(0), { attributes: false, childList: true, subtree: true } );

        } else  if ( !observeMode ) {
            updateInterval = setInterval( trackUpdates, 250 );
        }

        console.info( "Nicer tooltips installed." );
    }

    $.nicerTooltip = install;
})( jQuery );