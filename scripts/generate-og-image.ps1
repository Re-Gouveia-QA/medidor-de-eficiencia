<#
  Gera public/og-image.png (1200x630) - preview social (Open Graph/Twitter Card).
  Nao e uma dependencia de runtime nem de build do app: script de geracao de asset, roda uma
  vez (ou de novo se o texto/cores mudarem) e o PNG resultante e versionado no repo.

  Usa System.Drawing (.NET, ja disponivel no Windows) em vez de instalar um pacote novo so pra
  rasterizar uma imagem estatica - crawlers de redes sociais (WhatsApp/Twitter/LinkedIn/Facebook)
  nao renderizam SVG em og:image, por isso precisa ser raster.

  Cores hardcoded abaixo sao aproximacoes hex dos tokens oklch() de tokens.css (--paper/--ink),
  que System.Drawing nao entende como espaco de cor - mesma aproximacao ja usada em
  public/favicon.svg. #2563EB e o mesmo azul ja usado como cor padrao de categoria em
  categories/create.ejs e no favicon, reaproveitado aqui em vez de um tom novo.
#>

Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$paper = [System.Drawing.ColorTranslator]::FromHtml('#FAF6ED')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#23262F')
$inkSoft = [System.Drawing.ColorTranslator]::FromHtml('#6B6F76')
$accentBlue = [System.Drawing.ColorTranslator]::FromHtml('#2563EB')

$graphics.Clear($paper)

$titleFont = New-Object System.Drawing.Font('Georgia', 64, [System.Drawing.FontStyle]::Bold)
$subtitleFont = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Regular)

$titleBrush = New-Object System.Drawing.SolidBrush($ink)
$subtitleBrush = New-Object System.Drawing.SolidBrush($inkSoft)
$accentPen = New-Object System.Drawing.Pen($accentBlue, 6)
$accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$title = 'Medidor de Eficiência'
$subtitle = 'Registre seu dia. Entenda seu tempo.'

$titleSize = $graphics.MeasureString($title, $titleFont)
$titleX = [float](($width - $titleSize.Width) / 2)
$titleY = [float]240
$graphics.DrawString($title, $titleFont, $titleBrush, $titleX, $titleY)

# Traco ondulado abaixo do titulo - mesmo motivo visual do sublinhado usado no app (title-underline
# em auth/login.ejs, stat-underline em reports/index.ejs), so que desenhado via GraphicsPath em vez
# de um <svg><path>, ja que aqui o alvo e um PNG raster.
$underlineY = [float]($titleY + $titleSize.Height + 10)
$startX = [float]$titleX
$endX = [float]($titleX + $titleSize.Width)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddBezier(
  $startX, $underlineY,
  ($startX + ($endX - $startX) * 0.33), ($underlineY - 12),
  ($startX + ($endX - $startX) * 0.66), ($underlineY + 10),
  $endX, ($underlineY - 4)
)
$graphics.DrawPath($accentPen, $path)

$subtitleSize = $graphics.MeasureString($subtitle, $subtitleFont)
$subtitleX = [float](($width - $subtitleSize.Width) / 2)
$subtitleY = [float]($underlineY + 40)
$graphics.DrawString($subtitle, $subtitleFont, $subtitleBrush, $subtitleX, $subtitleY)

$outputPath = Join-Path $PSScriptRoot '..\public\og-image.png'
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Host "OG image generated at $outputPath"
