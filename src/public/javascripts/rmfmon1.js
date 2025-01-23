// Move the common functionality here (LPAR selection, date handling, etc.)
$(document).ready(function() {
    console.log("rmfmon1.js loaded");
    let runningProcesses = {};

    function getSelectedLPAR() {
        return $('#lpar').val();
    }

    function updateEndDateVisibility() {
        if ($('#continuous-monitoring').is(':checked')) {
            $('.end-date-container').hide();
        } else {
            $('.end-date-container').show();
        }
    }

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
                $('.monitor-start-date').val(hmaiConfig.defaultStartDate);
            }
            if (hmaiConfig.continuousMonitoring !== undefined) {
                $('#continuous-monitoring').prop('checked', hmaiConfig.continuousMonitoring);
            }
            updateEndDateVisibility();
        }
    }

    $('#lpar').change(function() {
        updateLPARFields();
    });

    $('#continuous-monitoring').change(function() {
        updateEndDateVisibility();
    });

    updateLPARFields();
}); 