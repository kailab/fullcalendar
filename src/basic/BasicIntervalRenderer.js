
function BasicIntervalRenderer() {
	var t = this;
	
	
	// exports
	t.renderIntervals = renderIntervals;
	t.clearIntervals = clearIntervals;
	t.setIntervalClass = setIntervalClass;
	
	
	// imports
	var opt = t.opt;
	var reportIntervals = t.reportIntervals;
	var reportIntervalClear = t.reportIntervalClear;
	var showIntervals = t.showIntervals;
	var hideIntervals = t.hideIntervals;
	var clearOverlays = t.clearOverlays;
	var inInterval = t.inInterval;
	var getTableBody = t.getTableBody;
	
	/* Rendering
	--------------------------------------------------------------------*/


	function setIntervalClass(elm,start,end,allDay) {
		var mode = inInterval(start,end,allDay);
		if(mode == 4){
			$(elm).removeClass('fc-not-in-interval')
				.removeClass('fc-partly-in-interval')
				.addClass('fc-in-interval');
		}else if(mode >0){
			$(elm).removeClass('fc-in-interval')
				.removeClass('fc-not-in-interval')
				.addClass('fc-partly-in-interval');
		}else{
			$(elm).removeClass('fc-in-interval')
				.removeClass('fc-partly-in-interval')
				.addClass('fc-not-in-interval');
		}
	}
	
	
	function renderIntervals(intervals) {
		reportIntervals(intervals);
		var tbody = getTableBody();
		var d = cloneDate(t.visStart);
		var nwe = opt('weekends') ? 0 : 1;
		tbody.find('td').each(function() {
			var td = $(this);
			setIntervalClass(this,d,d,true);
			addDays(d, 1);
			if (nwe) {
				skipWeekend(d);
			}
		});
	}
	
	
	function clearIntervals() {
		reportIntervalClear();
	}
	
}
