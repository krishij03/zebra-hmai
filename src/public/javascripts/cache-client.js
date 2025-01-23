$(document).ready(function() {
    console.log("cache-client.js loaded");
    let cacheRunningProcesses = {};

    function updateCacheButtonState(lpar) {
        const startButton = $('#start-cache');
        const stopButton = $('#stop-cache');
        if (cacheRunningProcesses[lpar] && cacheRunningProcesses[lpar].isRunning) {
            startButton.prop('disabled', true).text('Running...');
            if (cacheRunningProcesses[lpar].continuousMonitoring) {
                stopButton.show();
            } else {
                stopButton.hide();
            }
        } else {
            startButton.prop('disabled', false).text('Start');
            stopButton.hide();
        }
    }

    $('#start-cache').click(function() {
        if (!checkLPARSelected()) return;

        const lpar = getSelectedLPAR();
        if (cacheRunningProcesses[lpar] && cacheRunningProcesses[lpar].isRunning) {
            alert(`Cache process is already running for ${lpar}`);
            return;
        }

        var startDate = $('#cache-start-date').val();
        var endDate = $('#cache-end-date').val();
        var continuousMonitoring = $('#continuous-monitoring').is(':checked');

        // Rest of the cache start functionality...
    });

    // Rest of the cache-specific functionality...
}); 