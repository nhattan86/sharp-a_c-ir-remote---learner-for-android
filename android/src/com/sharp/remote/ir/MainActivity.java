package com.sharp.remote.ir;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.ConsumerIrManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String TAG = "SharpAcRemote";
    private static final String ASSET_HOST = "appassets.local";

    private WebView webView;
    private ConsumerIrManager irManager;

    public class AndroidIrBridge {
        @JavascriptInterface
        public boolean hasIrEmitter() {
            boolean hasEmitter = irManager != null && irManager.hasIrEmitter();
            Log.d(TAG, "hasIrEmitter query: " + hasEmitter);
            return hasEmitter;
        }

        @JavascriptInterface
        public void transmit(int carrierFrequency, String patternCsv) {
            Log.d(TAG, "transmit called: freq=" + carrierFrequency);
            if (irManager == null || !irManager.hasIrEmitter()) {
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "Thiết bị không có mắt hồng ngoại phần cứng", Toast.LENGTH_SHORT).show();
                });
                return;
            }

            try {
                String[] tokens = patternCsv.split(",");
                int[] pattern = new int[tokens.length];
                for (int i = 0; i < tokens.length; i++) {
                    pattern[i] = Integer.parseInt(tokens[i].trim());
                }

                irManager.transmit(carrierFrequency > 0 ? carrierFrequency : 38000, pattern);
                Log.d(TAG, "Transmitted " + pattern.length + " pulses at " + carrierFrequency + "Hz");
            } catch (Exception e) {
                Log.e(TAG, "Error transmitting IR: " + e.getMessage(), e);
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on while interacting with remote
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        try {
            irManager = (ConsumerIrManager) getSystemService(Context.CONSUMER_IR_SERVICE);
        } catch (Exception e) {
            Log.e(TAG, "Failed to get ConsumerIrManager", e);
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setTextZoom(100);

        // Expose native IR bridges for React
        AndroidIrBridge bridge = new AndroidIrBridge();
        webView.addJavascriptInterface(bridge, "AndroidIr");
        webView.addJavascriptInterface(bridge, "ConsumerIr");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("WebViewConsole", consoleMessage.message() + " -- From line "
                        + consoleMessage.lineNumber() + " of " + consoleMessage.sourceId());
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    request.grant(request.getResources());
                });
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();

                if (ASSET_HOST.equalsIgnoreCase(host) || "localhost".equalsIgnoreCase(host)) {
                    String path = uri.getPath();
                    if (path == null || path.isEmpty() || "/".equals(path)) {
                        path = "/index.html";
                    }

                    // Remove leading slash
                    String cleanPath = path.startsWith("/") ? path.substring(1) : path;
                    String[] candidates = {
                        cleanPath,
                        cleanPath.replace('/', '\\'),
                        "dist/" + cleanPath,
                        "dist\\" + cleanPath.replace('/', '\\')
                    };

                    InputStream is = null;
                    String matchedPath = null;
                    for (String candidate : candidates) {
                        try {
                            is = getAssets().open(candidate);
                            matchedPath = candidate;
                            break;
                        } catch (Exception ignored) {
                        }
                    }

                    if (is != null) {
                        String mimeType = getMimeType(path);
                        Map<String, String> headers = new HashMap<>();
                        headers.put("Access-Control-Allow-Origin", "*");
                        headers.put("Cache-Control", "no-cache");
                        return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, is);
                    } else {
                        Log.w(TAG, "Asset not found for path: " + path);
                        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }
        });

        // Request runtime permissions if needed
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] permissions = {
                android.Manifest.permission.CAMERA,
                android.Manifest.permission.RECORD_AUDIO,
                android.Manifest.permission.VIBRATE
            };
            boolean needsRequest = false;
            for (String p : permissions) {
                if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) {
                    needsRequest = true;
                    break;
                }
            }
            if (needsRequest) {
                requestPermissions(permissions, 101);
            }
        }

        // Load application through intercepted offline host
        webView.loadUrl("https://" + ASSET_HOST + "/index.html");
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        return "application/octet-stream";
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
