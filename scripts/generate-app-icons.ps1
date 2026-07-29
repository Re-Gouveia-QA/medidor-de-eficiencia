<#
  Gera os icones de app do manifest PWA (public/icons/icon-192.png, icon-512.png,
  icon-maskable-512.png) a partir do mesmo visual de public/favicon.svg (quadrado de cantos
  arredondados + "S" + traco ondulado), pra nao inventar uma segunda identidade visual so pro
  icone do app instalado.

  Script de geracao de asset (nao e dependencia de runtime/build) - mesmo padrao ja estabelecido
  em scripts/generate-og-image.ps1: System.Drawing (.NET, ja disponivel no Windows), roda uma vez
  (ou de novo se as cores mudarem) e os PNGs resultantes sao versionados no repo.

  Cores hardcoded abaixo sao as mesmas ja usadas em public/favicon.svg (aproximacoes hex dos
  tokens oklch() de tokens.css calculadas nesta mesma sessao pra recalibrar o favicon):
  --paper #FAECDA, --ink #3C291D, --accent-blue #2171CC.

  Variante "maskable" (icon-maskable-512): Android/Chrome recortam o icone adaptativo em formatos
  variados (circulo, squircle, etc.) - por isso o fundo preenche o quadrado inteiro sem cantos
  arredondados (o proprio SO aplica a mascara) e o desenho "S"+traco fica reduzido e centralizado
  dentro da "zona segura" (raio de ~40% a partir do centro, por spec), pra nunca ser cortado.
#>

Add-Type -AssemblyName System.Drawing

$paper = [System.Drawing.ColorTranslator]::FromHtml('#FAECDA')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#3C291D')
$accentBlue = [System.Drawing.ColorTranslator]::FromHtml('#2171CC')

function New-RoundedRectPath {
  param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Rx, [float]$Ry)

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $dx = $Rx * 2
  $dy = $Ry * 2

  $path.AddArc($X, $Y, $dx, $dy, 180, 90)
  $path.AddArc(($X + $Width - $dx), $Y, $dx, $dy, 270, 90)
  $path.AddArc(($X + $Width - $dx), ($Y + $Height - $dy), $dx, $dy, 0, 90)
  $path.AddArc($X, ($Y + $Height - $dy), $dx, $dy, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-IconBitmap {
  param([int]$Size, [switch]$Maskable)

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $paperBrush = New-Object System.Drawing.SolidBrush($paper)

  # Fator de escala do desenho (letra + traco) dentro do canvas: 1.0 nos icones normais
  # (full-bleed, igual ao favicon.svg); reduzido no maskable pra caber na zona segura.
  $scale = if ($Maskable) { 0.6 } else { 1.0 }
  $offsetX = ($Size - $Size * $scale) / 2
  $offsetY = ($Size - $Size * $scale) / 2

  if ($Maskable) {
    # Fundo preenche o quadrado inteiro, sem cantos arredondados - o SO aplica a mascara.
    $graphics.FillRectangle($paperBrush, 0, 0, $Size, $Size)
  } else {
    $rx = $Size * 0.25
    $ry = $Size * 0.1875
    $bgPath = New-RoundedRectPath -X 0 -Y 0 -Width $Size -Height $Size -Rx $rx -Ry $ry
    $graphics.FillPath($paperBrush, $bgPath)
    $bgPath.Dispose()
  }

  $fontSize = [float]($Size * $scale * 0.59375)
  $font = New-Object System.Drawing.Font('Georgia', $fontSize, [System.Drawing.FontStyle]::Bold)
  $textBrush = New-Object System.Drawing.SolidBrush($ink)
  $stringFormat = New-Object System.Drawing.StringFormat
  $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center

  $textX = [float]($offsetX + $Size * $scale * 0.5)
  $textY = [float]($offsetY + $Size * $scale * 0.71875 - $fontSize)
  $graphics.DrawString('S', $font, $textBrush, $textX, $textY, $stringFormat)

  $strokePen = New-Object System.Drawing.Pen($accentBlue, [float]($Size * $scale * 0.0625))
  $strokePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $strokePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $strokePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $strokePath.AddBezier(
    [float]($offsetX + $Size * $scale * 0.25), [float]($offsetY + $Size * $scale * 0.78125),
    [float]($offsetX + $Size * $scale * 0.3958), [float]($offsetY + $Size * $scale * 0.90625),
    [float]($offsetX + $Size * $scale * 0.6042), [float]($offsetY + $Size * $scale * 0.90625),
    [float]($offsetX + $Size * $scale * 0.75), [float]($offsetY + $Size * $scale * 0.75)
  )
  $graphics.DrawPath($strokePen, $strokePath)

  $strokePath.Dispose()
  $font.Dispose()
  $textBrush.Dispose()
  $strokePen.Dispose()
  $paperBrush.Dispose()

  return $bitmap
}

$iconsDir = Join-Path $PSScriptRoot '..\public\icons'
if (-not (Test-Path $iconsDir)) {
  New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

$icon192 = New-IconBitmap -Size 192
$icon192.Save((Join-Path $iconsDir 'icon-192.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$icon192.Dispose()

$icon512 = New-IconBitmap -Size 512
$icon512.Save((Join-Path $iconsDir 'icon-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.Dispose()

$iconMaskable512 = New-IconBitmap -Size 512 -Maskable
$iconMaskable512.Save((Join-Path $iconsDir 'icon-maskable-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$iconMaskable512.Dispose()

Write-Host "App icons generated at $iconsDir"
