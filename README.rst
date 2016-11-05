Pola Web Extension
==================

Install
=======

Chrome
------

1) Edit the **manifest.json** file and remove:

.. code::

    "https://*/*",
    "http://*/*",

.. code-block::

    ,

    "-ms-preload": {
        "backgroundScript": "backgroundScriptsAPIBridge.js",
        "contentScript": "contentScriptsAPIBridge.js"
    }

2) Type chrome://extensions/ into the address bar and press **ENTER**
3) Select the **Developer mode** checkbox
4) Click the **Load unpacked extension...** button
5) Select the Pola's folder and click the **OK** button

Firefox
-------

1) Edit the **manifest.json** file and remove:

.. code::

    "https://*/*",
    "http://*/*",

.. code-block::

    ,

    "-ms-preload": {
        "backgroundScript": "backgroundScriptsAPIBridge.js",
        "contentScript": "contentScriptsAPIBridge.js"
    }

2) Type about:debugging into the address bar and press **ENTER**
3) Click the **Load Temporary Add-on** button
4) Select the **manifest.json** file and click the **OK** button

Edge
----

1) Type about:flags into the address bar and press **ENTER**
2) Select the **Enable extension developer features (this might put your device at risk)** checkbox
3) Restart Edge
4) Select **Extensions** from the menu
5) Click the **Load Extension** button
6) Select the Pola's folder and click the **Select Folder** button
7) Click on Pola and enable the **Show button next to the address bar** option