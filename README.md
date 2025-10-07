# hcf2023

> 来自 https://hcf2023.top/

设备检测 - 安卓还是苹果

由于原网站已无法访问，故开此 Github 仓库用于留档

__仅做技术交流使用，请谨慎使用！！！__

---

* 检测到非苹果设备时，会在后台启用 WebGL 渲染消耗性能造成卡顿

* 临时禁用 WebGL 渲染：
  * 使用 `index.html?disablecanvas` 访问即可

---

高级检查 API 返回结果示例（`/api/client-hints`）：

```json
{
    "success": true,
    "timestamp": "2025-10-02T03:30:53.323Z",
    "clientHints": {
        "userAgent": "\"Google Chrome\";v=\"130\", \"Chromium\";v=\"130\", \"Not.A/Brand\";v=\"99\"",
        "mobile": false,
        "platform": "Windows",
        "platformVersion": null,
        "arch": null,
        "model": null,
        "fullVersion": null,
        "fullVersionList": null
    },
    "detectedOS": "Windows",
    "isMobile": false,
    "hasHighEntropyData": false,
    "serverSupport": {
        "acceptCH": true,
        "permissionsPolicy": true,
        "criticalCH": true,
        "https": true
    }
}
```