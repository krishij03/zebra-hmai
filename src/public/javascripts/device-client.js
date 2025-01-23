$(document).ready(function() {
    console.log("device-client.js loaded");
    let deviceRunningProcesses = {};

    function updateDeviceButtonState(lpar) {
        const startButton = $('#start-device');
        const stopButton = $('#stop-device');
        if (deviceRunningProcesses[lpar] && deviceRunningProcesses[lpar].isRunning) {
            startButton.prop('disabled', true).text('Running...');
            if (deviceRunningProcesses[lpar].continuousMonitoring) {
                stopButton.show();
            } else {
                stopButton.hide();
            }
        } else {
            startButton.prop('disabled', false).text('Start');
            stopButton.hide();
        }
    }

    $('#start-device').click(function() {
        if (!checkLPARSelected()) return;

        const lpar = getSelectedLPAR();
        if (deviceRunningProcesses[lpar] && deviceRunningProcesses[lpar].isRunning) {
            alert(`Device process is already running for ${lpar}`);
            return;
        }

        var startDate = $('#device-start-date').val();
        var endDate = $('#device-end-date').val();
        var continuousMonitoring = $('#continuous-monitoring').is(':checked');

        // Rest of the device start functionality...
    });

    // Rest of the device-specific functionality...
}); 