

打開D:\project\ai\ai-project\mediaplayerai,

用react+expo+elentron開發windows, android,ios, mac os都能使用的多媒體撥放器.

有上下兩個面板,上面的面板是控制面板,可以控制前一首後一首,第一首,最後一首,可以連續撥放,隨機撥放,往前10秒,往後10秒.能調整音量.
控制不同的聲域模式,有bass, pop,....等不同模式.可以手動調整.

下面是playlist,可以加目錄,加檔案進playlist.
playlist可以儲存成json檔案匯入匯出.點兩下playlist的檔案可以撥放那一首歌.

另外加上claude, openai, deepseek, gemini的api支援.
可以AI支援查詢歌曲資訊如歌手,歌曲基本資訊等,可以由音樂自動搜尋歌詞,可以開關AI支援.
透過「聽音辨曲」或「哼唱搜尋」快速幫你找出歌曲名稱

需支援大部分的歌曲格式,如mp3,wav,...等主流歌曲格式.

要支援avi, mpg, mpeg, mp4...等主流影像檔.
撥放影像檔時會有另一個畫面來撥放影片.可以控制前一首後一首,第一首,最後一首,可以連續撥放,隨機撥放,往前10秒,往後10秒.能調整音量.
按右鍵可以全螢幕撥放,移動滑鼠時下方顯示控制區域.可以控制前一首後一首,第一首,最後一首,可以連續撥放,隨機撥放,往前10秒,往後10秒.能調整音量.
滑鼠移開後下方控制區域就消失,恢復全螢幕撥放.
按右鍵可以AI支援查詢影片資訊如角色,年分,摘要,導演,等基本資訊等,可以開關AI支援.

上方控制面板要有AI api設定按鈕,按下去可以設定AI API. 開關.api key設定. 主要可以使用的model列表,區分聲音及影像的model.及支援手動model輸入,設定完可以測試及儲存.

全能視訊播放器是一款專業的視訊播放工具。它支持所有視訊格式，支持 4K/超高清視訊文件，並且能夠高清播放。它是安卓手機和平板上欣賞影片的最佳選擇。全能視訊播放器還能夠保護你的私密視訊，避免被其他人誤刪或者看見。

直接封裝 VLC Kit 或 mpv 的跨平台開源庫，即可秒級支援所有 4K、MKV、AVI 等萬能格式。
- 支持所有的視訊格式，包括 MKV、MP4、M4V、AVI、MOV、3GP、FLV、WMV、RMVB、TS 等。
- 支持多種播放選項：自動旋轉屏幕、設置畫面比例、屏幕鎖定等。
- 支持在線字幕下載，並且提供更多字幕微調選項。
- 調整字幕和音頻。
- 使用 Chromecast 投放視訊到電視上播放。

啟動廣告 (App Open Ads)：每日用戶首次開啟 App 時顯示（3 秒可跳過），收益最高，且最不影響觀影體驗。
橫幅與原生廣告：在檔案列表、設定選單植入 Google AdMob 的原生廣告，避免干擾核心播放流程。
插頁廣告 (Interstitial)：僅在用戶「關閉影片」或「返回上一頁」的斷點時彈出，嚴禁在播放中途打斷。

核心賣點：支援網際網路/區域網路串流（SMB、FTP、WebDAV）、整合 Google Drive 與 Dropbox 直接播放、自動抓取線上電影封面與簡介。付費模式：採取按月、按年訂閱。持續更新雲端接口與解碼器，以合理化訂閱制的必要性。

在控制面板加上切換亮暗面版功能.
加上中文及英文切換功能.可自由切換中文或切換成英文.若是台港澳中國,預設繁體中文,以外的地方,預設成英文


給我一個設定檔案,可以設定是否要開啟廣告功能.我做unit test時可以選擇開啟或關閉廣告.

產生金鑰,到Google Play Console註冊這個com.mediaplayerai.app app id.
D:\project\ai\ai-project\keystore>keytool -list -v -keystore D:\project\ai\ai-project\keystore\keystore
輸入金鑰儲存庫密碼:
憑證指紋:
         SHA1: 71:42:04:CC:FB:4E:EE:6C:FE:4A:51:95:CC:CE:16:B8:07:F9:D5:C5
         SHA256: D0:52:6A:5B:C5:A6:94:81:56:AC:CE:DA:62:48:73:93:DF:CC:ED:58:88:D6:AA:3A:67:F4:2D:32:71:EE:02:CE


"C:\Users\Lance Wu\AppData\Local\Android\Sdk\tools\bin\sdkmanager.bat" "ndk;26.1.10909125"
----------------
現在你需要在終端機手動刪掉這兩個 .cxx 快取（Linux sandbox 沒有 Windows 刪除權限）：
cmdcd D:\project\ai\ai-project\mediaplayerai
rmdir /s /q node_modules\react-native-worklets\android\.cxx
rmdir /s /q node_modules\react-native-screens\android\.cxx
然後再 build：
cmdcd android
gradlew clean
gradlew assembleRelease

✅ 後續步驟（應用啟動後）：
1.
去 Google AdMob 建立帳戶
2.
建立應用並取得 Application ID（格式：ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy）
3.
將真實 ID 填入 AndroidManifest.xml
4.
取消 App.tsx 中被註解的廣告初始化代碼
--------------

開啟關閉廣告:目前關閉廣告
-------------------
想在裝置上看測試廣告 → 取消上面那行的註解，或在 .env 暫時改成 EXPO_PUBLIC_ADS_ENABLED=true 並加上真實/測試 ID
D:\project\ai\ai-project\mediaplayerai\src\App.tsx
// AppConfig.enableTestAds();

啟動方式：
bash
npm install --legacy-peer-deps
npm install
npx expo install react-native-web @expo/metro-runtime

npm run web          # 瀏覽器測試
npm run electron:dev # Windows/macOS Electron
npm run android      # Android
npm run ios          # iOS

手機版
npx expo prebuild --platform android

# 2. 一鍵 build：先 export web，再打包 Electron
npm run build:electron


