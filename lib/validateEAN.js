/**
 * Validates an EAN-8 or EAN-13 barcode using the check digit algorithm.
 */
function validateEAN(elem) {
    if (isNaN(elem)) {
        return false;
    }
    let sum = 0;
    if (elem.length === 8) {
        sum = (parseInt(elem[0], 10) + parseInt(elem[2], 10)
                + parseInt(elem[4], 10) + parseInt(elem[6], 10))
                * 3
                + parseInt(elem[1], 10)
                + parseInt(elem[3], 10)
                + parseInt(elem[5], 10);
    } else {
        sum = (parseInt(elem[1], 10) + parseInt(elem[3], 10)
                + parseInt(elem[5], 10) + parseInt(elem[7], 10)
                + parseInt(elem[9], 10) + parseInt(elem[11], 10))
                * 3
                + parseInt(elem[0], 10)
                + parseInt(elem[2], 10)
                + parseInt(elem[4], 10)
                + parseInt(elem[6], 10)
                + parseInt(elem[8], 10) + parseInt(elem[10], 10);
    }
    let num = (10 - (sum % 10)) % 10;
    return num === parseInt(elem[elem.length - 1], 10);
}

if (typeof module !== 'undefined') module.exports = { validateEAN };
