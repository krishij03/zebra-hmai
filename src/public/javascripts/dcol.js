$(document).ready(function() {
    console.log("dcol.js loaded");
    let runningProcesses = {};

    // Select All functionality
    $('#select-all-metrics').change(function() {
        $('input[name="metrics"]').prop('checked', $(this).prop('checked'));
    });

    // Update Select All checkbox state when individual metrics are clicked
    $('input[name="metrics"]').change(function() {
        if($('input[name="metrics"]:checked').length == $('input[name="metrics"]').length) {
            $('#select-all-metrics').prop('checked', true);
        } else {
            $('#select-all-metrics').prop('checked', false);
        }
    });

    function getSelectedLPAR() {
        return $('#lpar').val();
    }

    function updateEndDateVisibility() {
        if ($('#continuous-monitoring').is(':checked')) {
            $('#end-date-container').hide();
        } else {
            $('#end-date-container').show();
        }
    }

    function updateStartButtonState(lpar) {
        const startButton = $('#start-dcol');
        const stopButton = $('#stop-dcol');
        if (runningProcesses[lpar] && runningProcesses[lpar].isRunning) {
            startButton.prop('disabled', true).text('Running...');
            if (runningProcesses[lpar].continuousMonitoring) {
                stopButton.show();
            } else {
                stopButton.hide();
            }
        } else {
            startButton.prop('disabled', false).text('Start');
            stopButton.hide();
        }
    }

    $('#lpar').change(function() {
        const selectedLPAR = $(this).val();
        updateStartButtonState(selectedLPAR);
        updateLPARFields();
    });

    function checkLPARSelected() {
        const lpar = getSelectedLPAR();
        if (lpar === 'Select LPAR' || !lpar) {
            alert('Please select an LPAR before proceeding.');
            return false;
        }
        return true;
    }

    function updateLPARFields() {
        const selectedLPAR = getSelectedLPAR();
        if (selectedLPAR && lparConfig[selectedLPAR] && lparConfig[selectedLPAR].hmai) {
            const hmaiConfig = lparConfig[selectedLPAR].hmai;
            if (hmaiConfig.defaultStartDate) {
                $('#dcol-start-date').val(hmaiConfig.defaultStartDate);
            }
            if (hmaiConfig.continuousMonitoring !== undefined) {
                $('#continuous-monitoring').prop('checked', hmaiConfig.continuousMonitoring);
            }
            updateEndDateVisibility();
        }
    }

    updateLPARFields();

    function getSelectedMetrics() {
        return $('input[name="metrics"]:checked').map(function() {
            return $(this).val();
        }).get();
    }

    $('#continuous-monitoring').change(function() {
        updateEndDateVisibility();
    });

    $('#start-dcol').click(function() {
        if (!checkLPARSelected()) return;

        const lpar = getSelectedLPAR();
        if (runningProcesses[lpar] && runningProcesses[lpar].isRunning) {
            alert(`DCOL process is already running for ${lpar}`);
            return;
        }

        const selectedMetrics = getSelectedMetrics();
        if (selectedMetrics.length === 0) {
            alert("Please select at least one metric before starting the process.");
            return;
        }

        var startDate = $('#dcol-start-date').val();
        var endDate = $('#dcol-end-date').val();
        var continuousMonitoring = $('#continuous-monitoring').is(':checked');

        runningProcesses[lpar] = { isRunning: true, continuousMonitoring: continuousMonitoring };
        updateStartButtonState(lpar);

        $.ajax({
            url: '/dcol/start',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                startDate: startDate, 
                endDate: endDate, 
                lpar: lpar,
                continuousMonitoring: continuousMonitoring,
                metrics: selectedMetrics
            }),
            success: function(data) {
                if (data.success) {
                    if (continuousMonitoring) {
                        alert(`DCOL process started successfully for ${lpar} and is now running continuously.`);
                    } else {
                        alert(`DCOL process completed successfully for ${lpar}.`);
                        runningProcesses[lpar].isRunning = false;
                    }
                } else {
                    alert('DCOL script execution failed: ' + data.message);
                    runningProcesses[lpar].isRunning = false;
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('DCOL start error:', textStatus, errorThrown);
                runningProcesses[lpar].isRunning = false;
            },
            complete: function() {
                updateStartButtonState(lpar);
            }
        });
    });

    $('#stop-dcol').click(function() {
        const lpar = getSelectedLPAR();
        if (runningProcesses[lpar] && runningProcesses[lpar].isRunning) {
            $.ajax({
                url: '/dcol/stop-monitoring',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ lpar: lpar }),
                success: function(data) {
                    if (data.success) {
                        delete runningProcesses[lpar];
                        updateStartButtonState(lpar);
                        alert(`Stopped DCOL process for ${lpar}`);
                    } else {
                        alert('Failed to stop DCOL process: ' + data.message);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('Error stopping DCOL process:', textStatus, errorThrown);
                    alert('An error occurred while stopping the DCOL process');
                }
            });
        } else {
            alert(`No running DCOL process for ${lpar}`);
        }
    });

    $('#clear-db').click(function() {
        if (!checkLPARSelected()) return;
    
        if (confirm('Are you sure you want to clear all data from the database and DCOL memory?')) {
            var lpar = getSelectedLPAR();
            $.ajax({
                url: '/dcol/clear-db',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ lpar: lpar }),
                success: function(data) {
                    if (data.success) {
                        alert('Database and DCOL memory cleared successfully: ' + data.message);
                        if (runningProcesses[lpar]) {
                            delete runningProcesses[lpar];
                            updateStartButtonState(lpar);
                        }
                    } else {
                        alert('Failed to clear database and DCOL memory: ' + data.message);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('Error:', textStatus, errorThrown);
                    alert('An error occurred while clearing the database and DCOL memory');
                }
            });
        }
    });

    function fetchRunningProcesses() {
        $.ajax({
            url: '/dcol/running-processes',
            method: 'GET',
            success: function(data) {
                runningProcesses = data;
                updateStartButtonState(getSelectedLPAR());
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('Error fetching running processes:', textStatus, errorThrown);
                runningProcesses = {};
                updateStartButtonState(getSelectedLPAR());
            }
        });
    }

    fetchRunningProcesses();
    setInterval(fetchRunningProcesses, 10000);
}); 