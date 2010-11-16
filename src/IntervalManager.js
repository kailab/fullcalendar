
var intervalGUID = 1;

function IntervalManager(options, sources) {
	var t = this;
	
	
	// exports
	t.isFetchNeeded = isFetchNeeded;
	t.fetchIntervals = fetchIntervals;
	t.addIntervalSource = addIntervalSource;
	t.removeIntervalSource = removeIntervalSource;
	t.updateInterval = updateInterval;
	t.renderInterval = renderInterval;
	t.removeIntervals = removeIntervals;
	t.clientIntervals = clientIntervals;
	t.normalizeInterval = normalizeInterval;
	
	// imports
	var trigger = t.trigger;
	var getView = t.getView;
	var reportIntervals = t.reportIntervals;
	
	
	// locals
	var rangeStart, rangeEnd;
	var currentFetchID = 0;
	var pendingSourceCnt = 0;
	var loadingLevel = 0;
	var dynamicIntervalSource = [];
	var cache = [];

	/* Fetching
	-----------------------------------------------------------------------------*/

	function isFetchNeeded(start, end) {
		return !rangeStart || start < rangeStart || end > rangeEnd;
	}
	
	function fetchIntervals(start, end) {
		rangeStart = start;
		rangeEnd = end;
		currentFetchID++;
		cache = [];
		pendingSourceCnt = 0;
		// do not count empty array sources
		$.each(sources,function(){
			if(!$.isArray(this) || this.length > 0){
				pendingSourceCnt++;
			}
		});
		for (var i=0; i<sources.length; i++) {
			if(!$.isArray(sources[i]) || sources[i].length > 0){
				fetchIntervalSource(sources[i], currentFetchID);
			}
		}
	}
	
	
	function fetchIntervalSource(source, fetchID) {
		_fetchIntervalSource(source, function(intervals) {
			if (fetchID == currentFetchID) {
				for (var i=0; i<intervals.length; i++) {
					normalizeInterval(intervals[i]);
					intervals[i].source = source;
				}
				cache = cache.concat(intervals);
				pendingSourceCnt--;
				if (!pendingSourceCnt) {
					reportIntervals(cache);
				}
			}
		});
	}
	
	
	function _fetchIntervalSource(source, callback) {
		if (typeof source == 'string') {
			var params = {};
			params[options.startParam] = Math.round(rangeStart.getTime() / 1000);
			params[options.endParam] = Math.round(rangeEnd.getTime() / 1000);
			if (options.cacheParam) {
				params[options.cacheParam] = (new Date()).getTime(); // TODO: deprecate cacheParam
			}
			pushLoading();
			// TODO: respect cache param in ajaxSetup
			$.ajax({
				url: source,
				dataType: 'json',
				data: params,
				cache: options.cacheParam || false, // don't let jquery printerval caching if cacheParam is being used
				success: function(intervals) {
					popLoading();
					callback(intervals);
				}
			});
		}
		else if ($.isFunction(source)) {
			pushLoading();
			source(cloneDate(rangeStart), cloneDate(rangeEnd), function(intervals) {
				popLoading();
				callback(intervals);
			});
		}
		else {
			callback(source); // src is an array
		}
	}
	
	
	
	/* Sources
	-----------------------------------------------------------------------------*/
	
	
	sources.push(dynamicIntervalSource);
	

	function addIntervalSource(source) {
		sources.push(source);
		pendingSourceCnt++;
		fetchIntervalSource(source, currentFetchID); // will intervalually call reportIntervals
	}
	

	function removeIntervalSource(source) {
		sources = $.grep(sources, function(src) {
			return src != source;
		});
		// remove all client intervals from that source
		cache = $.grep(cache, function(e) {
			return e.source != source;
		});
		reportIntervals(cache);
	}
	
	
	
	/* Manipulation
	-----------------------------------------------------------------------------*/
	
	
	function updateInterval(interval) { // update an existing interval
		var i, len = cache.length, e,
			defaultIntervalEnd = getView().defaultIntervalEnd, // getView???
			startDelta = interval.start - interval._start,
			endDelta = interval.end ?
				(interval.end - (interval._end || defaultIntervalEnd(interval))) // interval._end would be null if interval.end
				: 0;                                                      // was null and interval was just resized
		for (i=0; i<len; i++) {
			e = cache[i];
			if (e._id == interval._id && e != interval) {
				e.start = new Date(+e.start + startDelta);
				if (interval.end) {
					if (e.end) {
						e.end = new Date(+e.end + endDelta);
					}else{
						e.end = new Date(+defaultIntervalEnd(e) + endDelta);
					}
				}else{
					e.end = null;
				}
				e.title = interval.title;
				e.url = interval.url;
				e.allDay = interval.allDay;
				e.className = interval.className;
				e.editable = interval.editable;
				normalizeInterval(e);
			}
		}
		normalizeInterval(interval);
		reportIntervals(cache);
	}
	
	
	function renderInterval(interval, stick) {
		normalizeInterval(interval);
		if (!interval.source) {
			if (stick) {
				dynamicIntervalSource.push(interval);
				interval.source = dynamicIntervalSource;
			}
			cache.push(interval);
		}
		reportIntervals(cache);
	}
	
	
	function removeIntervals(filter) {
		if (!filter) { // remove all
			cache = [];
			// clear all array sources
			for (var i=0; i<sources.length; i++) {
				if (typeof sources[i] == 'object') {
					sources[i] = [];
				}
			}
		}else{
			if (!$.isFunction(filter)) { // an interval ID
				var id = filter + '';
				filter = function(e) {
					return e._id == id;
				};
			}
			cache = $.grep(cache, filter, true);
			// remove intervals from array sources
			for (var i=0; i<sources.length; i++) {
				if (typeof sources[i] == 'object') {
					sources[i] = $.grep(sources[i], filter, true);
				}
			}
		}
		reportIntervals(cache);
	}
	
	
	function clientIntervals(filter) {
		if ($.isFunction(filter)) {
			return $.grep(cache, filter);
		}
		else if (filter) { // an interval ID
			filter += '';
			return $.grep(cache, function(e) {
				return e._id == filter;
			});
		}
		return cache; // else, return all
	}
	
	
	
	/* Loading State
	-----------------------------------------------------------------------------*/
	
	
	function pushLoading() {
		if (!loadingLevel++) {
			trigger('loading', null, true);
		}
	}
	
	
	function popLoading() {
		if (!--loadingLevel) {
			trigger('loading', null, false);
		}
	}
	
	
	
	/* Interval Normalization
	-----------------------------------------------------------------------------*/
	
	
	function normalizeInterval(interval) {
		interval._id = interval._id || (interval.id === undefined ? '_fc' + intervalGUID++ : interval.id + '');
		if (interval.date) {
			if (!interval.start) {
				interval.start = interval.date;
			}
			delete interval.date;
		}
		interval._start = cloneDate(interval.start = parseDate(interval.start, options.ignoreTimezone));
		interval.end = parseDate(interval.end, options.ignoreTimezone);
		if (interval.end && interval.end <= interval.start) {
			interval.end = null;
		}
		interval._end = interval.end ? cloneDate(interval.end) : null;
		if (interval.className) {
			if (typeof interval.className == 'string') {
				interval.className = interval.className.split(/\s+/);
			}
		}else{
			interval.className = [];
		}
		// TODO: if there is no start date, return false to indicate an invalid interval
	}

  /* Interval Check
	-----------------------------------------------------------------------------*/

}
