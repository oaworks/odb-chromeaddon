odb-chromeaddon
===============

Open Data Button Chrome Extension

### packaging for firefox
Firefox requires extra keys in the manifest, and the project files zip archived with extension ```.xpi```. The script ```pack_ffx.py``` does this. Supply the required [extension ID](https://developer.mozilla.org/en-US/Add-ons/Install_Manifests#id).
```./pack_ffx.py -i odb-ffx@openaccessbutton.org```
