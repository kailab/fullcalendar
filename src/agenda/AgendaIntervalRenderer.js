
function AgendaIntervalRenderer() {
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
	var getTableHead = t.getTableHead;
	var renderOutsideInterval = t.renderOutsideInterval;
	var clearIntervalOverlays = t.clearIntervalOverlays;

	/* Rendering
	--------------------------------------------------------------------*/


	function setIntervalClass(elm,start,end,allDay) {
		var mode = inInterval(start,end,allDay);
		if(mode == 4){
			$(elm).removeClass('fc-not-in-interval')
				.removeClass('fc-partly-in-interval')
				.addClass('fc-in-interval');
		}else if(mode > 0){
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
		// all day cells
		var thead = getTableHead();
		var d = cloneDate(t.visStart);
		var nwe = opt('weekends') ? 0 : 1;
		thead.find('.fc-all-day td').each(function() {
			var td = $(this);
			setIntervalClass(this,d,d,true);
			addDays(d, 1);
			if (nwe) {
				skipWeekend(d);
			}
		});

		// not in interval overlays
		var outsides = getOutsideIntervals(intervals);
		$.each(outsides,function(){
			renderOutsideInterval(this.start,this.end);
		});
	}


	function getOutsideIntervals(intervals) {
		// we expect no overlapping intervals
		// since they were fixed in the view
		var outsides = [{start:t.visStart}];
		$.each(intervals,function(){
			outsides[outsides.length-1].end = this.start;
			outsides.push({start:this.end});
		});
		outsides[outsides.length-1].end = t.visEnd;
		return outsides;
	}

	function clearIntervals() {
		clearIntervalOverlays();
		reportIntervalClear();
	}
	
}
