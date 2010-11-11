

function View(element, calendar, viewName) {
	var t = this;
	
	
	// exports
	t.element = element;
	t.calendar = calendar;
	t.name = viewName;
	t.opt = opt;
	t.trigger = trigger;
	t.reportEvents = reportEvents;
	t.eventEnd = eventEnd;
	t.reportEventElement = reportEventElement;
	t.reportEventClear = reportEventClear;
	t.eventElementHandlers = eventElementHandlers;
	t.showEvents = showEvents;
	t.hideEvents = hideEvents;
	t.eventDrop = eventDrop;
	t.eventResize = eventResize;
	t.reportIntervals = reportIntervals;
	t.intervalEnd = intervalEnd;
	t.reportIntervalElement = reportIntervalElement;
	t.reportIntervalClear = reportIntervalClear;
	t.intervalElementHandlers = intervalElementHandlers;
	t.showIntervals = showIntervals;
	t.hideIntervals = hideIntervals;
	// t.title
	// t.start, t.end
	// t.visStart, t.visEnd
	
	
	// imports
	var defaultEventEnd = t.defaultEventEnd;
	var normalizeEvent = calendar.normalizeEvent; // in EventManager
	var reportEventChange = calendar.reportEventChange;
	var defaultIntervalEnd = t.defaultIntervalEnd;
	var normalizeInterval = calendar.normalizeInterval; // in IntervalManager
	var reportIntervalChange = calendar.reportIntervalChange;
	
	// locals
	var eventsByID = {};
	var eventElements = [];
	var eventElementsByID = {};
	var intervalsByID = {};
	var intervalElements = [];
	var intervalElementsByID = {};
	var options = calendar.options;
	
	
	
	function opt(name, viewNameOverride) {
		var v = options[name];
		if (typeof v == 'object') {
			return smartProperty(v, viewNameOverride || viewName);
		}
		return v;
	}

	
	function trigger(name, thisObj) {
		return calendar.trigger.apply(
			calendar,
			[name, thisObj || t].concat(Array.prototype.slice.call(arguments, 2), [t])
		);
	}
	
	
	
	/* Event Data
	------------------------------------------------------------------------------*/
	
	
	// report when view receives new events
	function reportEvents(events) { // events are already normalized at this point
		eventsByID = {};
		var i, len=events.length, event;
		for (i=0; i<len; i++) {
			event = events[i];
			if (eventsByID[event._id]) {
				eventsByID[event._id].push(event);
			}else{
				eventsByID[event._id] = [event];
			}
		}
	}
	
	
	// returns a Date object for an event's end
	function eventEnd(event) {
		return event.end ? cloneDate(event.end) : defaultEventEnd(event);
	}
	
	
	
	/* Event Elements
	------------------------------------------------------------------------------*/
	
	
	// report when view creates an element for an event
	function reportEventElement(event, element) {
		eventElements.push(element);
		if (eventElementsByID[event._id]) {
			eventElementsByID[event._id].push(element);
		}else{
			eventElementsByID[event._id] = [element];
		}
	}
	
	
	function reportEventClear() {
		eventElements = [];
		eventElementsByID = {};
	}
	
	
	// attaches eventClick, eventMouseover, eventMouseout
	function eventElementHandlers(event, eventElement) {
		eventElement
			.click(function(ev) {
				if (!eventElement.hasClass('ui-draggable-dragging') &&
					!eventElement.hasClass('ui-resizable-resizing')) {
						return trigger('eventClick', this, event, ev);
					}
			})
			.hover(
				function(ev) {
					trigger('eventMouseover', this, event, ev);
				},
				function(ev) {
					trigger('eventMouseout', this, event, ev);
				}
			);
		// TODO: don't fire eventMouseover/eventMouseout *while* dragging is occuring (on subject element)
		// TODO: same for resizing
	}
	
	
	function showEvents(event, exceptElement) {
		eachEventElement(event, exceptElement, 'show');
	}
	
	
	function hideEvents(event, exceptElement) {
		eachEventElement(event, exceptElement, 'hide');
	}
	
	
	function eachEventElement(event, exceptElement, funcName) {
		var elements = eventElementsByID[event._id],
			i, len = elements.length;
		for (i=0; i<len; i++) {
			if (elements[i][0] != exceptElement[0]) {
				elements[i][funcName]();
			}
		}
	}
	
	
	
	/* Event Modification Reporting
	---------------------------------------------------------------------------------*/
	
	
	function eventDrop(e, event, dayDelta, minuteDelta, allDay, ev, ui) {
		var oldAllDay = event.allDay;
		var eventId = event._id;
		moveEvents(eventsByID[eventId], dayDelta, minuteDelta, allDay);
		trigger(
			'eventDrop',
			e,
			event,
			dayDelta,
			minuteDelta,
			allDay,
			function() {
				// TODO: investigate cases where this inverse technique might not work
				moveEvents(eventsByID[eventId], -dayDelta, -minuteDelta, oldAllDay);
				reportEventChange(eventId);
			},
			ev,
			ui
		);
		reportEventChange(eventId);
	}
	
	
	function eventResize(e, event, dayDelta, minuteDelta, ev, ui) {
		var eventId = event._id;
		elongateEvents(eventsByID[eventId], dayDelta, minuteDelta);
		trigger(
			'eventResize',
			e,
			event,
			dayDelta,
			minuteDelta,
			function() {
				// TODO: investigate cases where this inverse technique might not work
				elongateEvents(eventsByID[eventId], -dayDelta, -minuteDelta);
				reportEventChange(eventId);
			},
			ev,
			ui
		);
		reportEventChange(eventId);
	}
	
	
	/* Event Modification Math
	---------------------------------------------------------------------------------*/
	
	
	function moveEvents(events, dayDelta, minuteDelta, allDay) {
		minuteDelta = minuteDelta || 0;
		for (var e, len=events.length, i=0; i<len; i++) {
			e = events[i];
			if (allDay !== undefined) {
				e.allDay = allDay;
			}
			addMinutes(addDays(e.start, dayDelta, true), minuteDelta);
			if (e.end) {
				e.end = addMinutes(addDays(e.end, dayDelta, true), minuteDelta);
			}
			normalizeEvent(e, options);
		}
	}
	
	
	function elongateEvents(events, dayDelta, minuteDelta) {
		minuteDelta = minuteDelta || 0;
		for (var e, len=events.length, i=0; i<len; i++) {
			e = events[i];
			e.end = addMinutes(addDays(eventEnd(e), dayDelta, true), minuteDelta);
			normalizeEvent(e, options);
		}
	}




	/* Interval Data
	------------------------------------------------------------------------------*/
	
	
	// report when view receives new intervals
	function reportIntervals(intervals) { // intervals are already normalized at this point
		intervalsByID = {};
		var i, len=intervals.length, interval;
		for (i=0; i<len; i++) {
			interval = intervals[i];
			if (intervalsByID[interval._id]) {
				intervalsByID[interval._id].push(interval);
			}else{
				intervalsByID[interval._id] = [interval];
			}
		}
	}
	
	
	// returns a Date object for an interval's end
	function intervalEnd(interval) {
		return interval.end ? cloneDate(interval.end) : defaultIntervalEnd(interval);
	}
	
	
	
	/* Interval Elements
	------------------------------------------------------------------------------*/
	
	
	// report when view creates an element for an interval
	function reportIntervalElement(interval, element) {
		intervalElements.push(element);
		if (intervalElementsByID[interval._id]) {
			intervalElementsByID[interval._id].push(element);
		}else{
			intervalElementsByID[interval._id] = [element];
		}
	}
	
	
	function reportIntervalClear() {
		intervalElements = [];
		intervalElementsByID = {};
	}
	
	
	// attaches intervalClick, intervalMouseover, intervalMouseout
	function intervalElementHandlers(interval, intervalElement) {
		intervalElement
			.click(function(ev) {
				if (!intervalElement.hasClass('ui-draggable-dragging') &&
					!intervalElement.hasClass('ui-resizable-resizing')) {
						return trigger('intervalClick', this, interval, ev);
					}
			})
			.hover(
				function(ev) {
					trigger('intervalMouseover', this, interval, ev);
				},
				function(ev) {
					trigger('intervalMouseout', this, interval, ev);
				}
			);
		// TODO: don't fire intervalMouseover/intervalMouseout *while* dragging is occuring (on subject element)
		// TODO: same for resizing
	}
	
	
	function showIntervals(interval, exceptElement) {
		eachIntervalElement(interval, exceptElement, 'show');
	}
	
	
	function hideIntervals(interval, exceptElement) {
		eachIntervalElement(interval, exceptElement, 'hide');
	}
	
	
	function eachIntervalElement(interval, exceptElement, funcName) {
		var elements = intervalElementsByID[interval._id],
			i, len = elements.length;
		for (i=0; i<len; i++) {
			if (elements[i][0] != exceptElement[0]) {
				elements[i][funcName]();
			}
		}
	}
	

}
