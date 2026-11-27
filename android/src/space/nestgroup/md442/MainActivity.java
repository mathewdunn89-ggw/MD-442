package space.nestgroup.md442;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.util.Base64;
import android.widget.Toast;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/** MD|442 for Android: the phone console, full screen (swipe from the edge to show the system bars).
 *  Loads the latest version from the site; when there is no connection it uses the copy built into the app. */
public class MainActivity extends Activity {
    static final String HOST = "music.nestgroup.space";
    static final String START = "https://" + HOST + "/md442/app/";
    WebView web;
    static final int PICK = 1, SAVE = 2;
    ValueCallback<Uri[]> picking;
    byte[] saving;
    // Exports (beats, MIDI, recordings) are blob: links with a download name; the WebView cannot save those itself,
    // so the page hands the bytes to the app, which asks where to save them.
    static final String DL_JS = "(function(){if(window.__md442dl)return;window.__md442dl=1;"
        + "function send(a){var u=a.href||'';if(!/^(blob|data):/.test(u))return false;var n=a.getAttribute('download')||'MD442 file';"
        + "fetch(u).then(function(r){return r.blob()}).then(function(b){var f=new FileReader();f.onload=function(){MD442Android.save(f.result,n,b.type||'application/octet-stream')};f.readAsDataURL(b)});return true}"
        + "var oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download')&&send(this))return;return oc.call(this)};"
        + "document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[download]');if(a&&send(a))e.preventDefault()},true);})();";

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= 28) {
            try { WindowManager.LayoutParams lp = w.getAttributes(); WindowManager.LayoutParams.class.getField("layoutInDisplayCutoutMode").setInt(lp, 1); w.setAttributes(lp); } catch (Throwable t) {}
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(201, 203, 206));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " MD442-Android/1.6");
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                Uri u = Uri.parse(url); String p = u.getPath() == null ? "/" : u.getPath();
                if (HOST.equals(u.getHost())) {
                    if (p.startsWith("/md442/app")) return false;
                    if (p.equals("/md442/") || p.equals("/md442")) { v.loadUrl(START); return true; }
                }
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) {}
                return true;
            }
            @Override public void onPageCommitVisible(WebView v, String url) { v.evaluateJavascript(DL_JS, null); }
            @Override public void onPageFinished(WebView v, String url) { v.evaluateJavascript(DL_JS, null); }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!"GET".equalsIgnoreCase(r.getMethod()) || !HOST.equals(u.getHost())) return null;
                String asset = assetFor(u.getPath());
                if (asset == null) return null;
                try {   // newest from the site first
                    HttpURLConnection c = (HttpURLConnection) new URL(u.toString()).openConnection();
                    c.setConnectTimeout(4000); c.setReadTimeout(8000);
                    for (Map.Entry<String, String> h : r.getRequestHeaders().entrySet()) if (!"accept-encoding".equalsIgnoreCase(h.getKey())) c.setRequestProperty(h.getKey(), h.getValue());
                    int code = c.getResponseCode();
                    if (code == 200) {
                        Map<String, String> hd = new HashMap<>(); hd.put("Cache-Control", "no-cache");
                        return new WebResourceResponse(mime(asset), "utf-8", 200, "OK", hd, c.getInputStream());
                    }
                    c.disconnect();
                } catch (Exception e) {}
                try {   // offline: the copy built into the app
                    InputStream in = getAssets().open(asset);
                    return new WebResourceResponse(mime(asset), "utf-8", in);
                } catch (Exception e) { return null; }
            }
        });
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void save(String dataUrl, final String name, final String mime) {
                try {
                    saving = Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), Base64.DEFAULT);
                    runOnUiThread(new Runnable() { public void run() {
                        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        i.addCategory(Intent.CATEGORY_OPENABLE);
                        i.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                        i.putExtra(Intent.EXTRA_TITLE, name);
                        try { startActivityForResult(i, SAVE); } catch (Exception e) { Toast.makeText(MainActivity.this, "No app to save files", Toast.LENGTH_LONG).show(); }
                    }});
                } catch (Exception e) {}
            }
        }, "MD442Android");
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams fp) {
                if (picking != null) picking.onReceiveValue(null);
                picking = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                if (fp != null && fp.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try { startActivityForResult(Intent.createChooser(i, "Open a beat"), PICK); } catch (Exception e) { picking = null; return false; }
                return true;
            }
        });
        web.setDownloadListener(new DownloadListener() {
            @Override public void onDownloadStart(String url, String ua, String cd, String mime, long len) {
                if (url.startsWith("blob:") || url.startsWith("data:")) {
                    web.evaluateJavascript("(function(){var a=document.createElement('a');a.href='" + url.replace("'", "") + "';a.setAttribute('download','MD442 file');" + "fetch(a.href).then(function(r){return r.blob()}).then(function(b){var f=new FileReader();f.onload=function(){MD442Android.save(f.result,'MD442 file',b.type||'application/octet-stream')};f.readAsDataURL(b)})})()", null);
                } else {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) {}
                }
            }
        });
        setContentView(web);
        immersive();
        if (b != null) web.restoreState(b); else web.loadUrl(START);
    }
    static String assetFor(String p) {
        if (p == null) return null;
        if (p.equals("/md442/app/") || p.equals("/md442/app") || p.equals("/md442/app/index.html")) return "md442/app/index.html";
        String[] files = { "/md442/md442.js", "/md442/md442.css", "/md442/md442-dark.css", "/md442/md442-ux.css",
            "/md442/app/icon-192.png", "/md442/app/icon-512.png", "/md442/app/manifest.webmanifest" };
        for (String f : files) if (p.equals(f)) return f.substring(1);
        return null;
    }
    static String mime(String a) {
        if (a.endsWith(".js")) return "text/javascript";
        if (a.endsWith(".css")) return "text/css";
        if (a.endsWith(".png")) return "image/png";
        if (a.endsWith(".webmanifest")) return "application/manifest+json";
        return "text/html";
    }
    void immersive() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        if (Build.VERSION.SDK_INT >= 30) {
            try {   // Android 11+: hide status and navigation bars; a swipe from the edge shows them for a moment
                Window w = getWindow();
                w.getClass().getMethod("setDecorFitsSystemWindows", boolean.class).invoke(w, false);
                Object c = w.getClass().getMethod("getInsetsController").invoke(w);
                Class<?> types = Class.forName("android.view.WindowInsets$Type");
                int bars = (Integer) types.getMethod("systemBars").invoke(null);
                c.getClass().getMethod("hide", int.class).invoke(c, bars);
                c.getClass().getMethod("setSystemBarsBehavior", int.class).invoke(c, 2);
            } catch (Throwable t) {}
        }
    }
    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == PICK && picking != null) {
            Uri[] out = null;
            if (res == RESULT_OK && data != null) {
                if (data.getClipData() != null) { int n = data.getClipData().getItemCount(); out = new Uri[n]; for (int k = 0; k < n; k++) out[k] = data.getClipData().getItemAt(k).getUri(); }
                else if (data.getData() != null) out = new Uri[] { data.getData() };
            }
            picking.onReceiveValue(out); picking = null;
        } else if (req == SAVE) {
            if (res == RESULT_OK && data != null && data.getData() != null && saving != null) {
                try { OutputStream o = getContentResolver().openOutputStream(data.getData()); o.write(saving); o.close(); Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show(); }
                catch (Exception e) { Toast.makeText(this, "Could not save the file", Toast.LENGTH_LONG).show(); }
            }
            saving = null;
        }
    }
    @Override public void onConfigurationChanged(android.content.res.Configuration c) { super.onConfigurationChanged(c); immersive(); }
    @Override protected void onResume() { super.onResume(); immersive(); }
    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}
