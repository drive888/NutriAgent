# OliveGemma FoodBD v2 模型包

模型包包含 OliveGemma 3B 基础模型、FoodBD v2 LoRA、推理 API 和部署说明。请从同一 [Release](https://github.com/drive888/NutriAgent/releases/tag/olivegemma-foodbd-v2) 下载 `OliveGemma_FoodBD_v2_backend.tar.xz.part01` 和 `OliveGemma_FoodBD_v2_backend.tar.xz.part02`。两段各 2,079,799,962 字节。

在下载目录按编号顺序拼接文件。Windows PowerShell 可运行以下命令。

```powershell
cmd.exe /c "copy /b OliveGemma_FoodBD_v2_backend.tar.xz.part01+OliveGemma_FoodBD_v2_backend.tar.xz.part02 OliveGemma_FoodBD_v2_backend.tar.xz"
Get-FileHash OliveGemma_FoodBD_v2_backend.tar.xz -Algorithm SHA256
```

Linux 或 macOS 可运行以下命令。

```sh
cat OliveGemma_FoodBD_v2_backend.tar.xz.part01 OliveGemma_FoodBD_v2_backend.tar.xz.part02 > OliveGemma_FoodBD_v2_backend.tar.xz
shasum -a 256 OliveGemma_FoodBD_v2_backend.tar.xz
```

合并后的文件应为 4,159,599,924 字节，SHA-256 为 `0914866e85c018d80332047d0d0a4dd197d7affc02f943c9f5b47efcecd354f5`。校验通过后运行 `tar -xf OliveGemma_FoodBD_v2_backend.tar.xz`，按包内 `README.md` 启动模型服务。

基础模型及其衍生权重适用 Gemma 使用条款及第 3.2 节限制。条款副本和声明随包提供。 [Gemma 使用条款](https://ai.google.dev/gemma/terms)
