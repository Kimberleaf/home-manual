<#
.SYNOPSIS
  Regenerates assets/house-manual.ico from the app's favicon artwork.

.DESCRIPTION
  The app's favicon is an inline SVG in dist/index.html. Windows shortcuts need
  a real .ico, so this redraws the same artwork with GDI+ at several sizes and
  packs them into one PNG-compressed icon file.

  Run it only if the branding changes; the generated .ico is committed.
#>
[CmdletBinding()]
param([string]$OutFile)

$ErrorActionPreference = 'Stop'
if (-not $OutFile) {
    $base = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
    $OutFile = Join-Path $base '..\assets\house-manual.ico'
}
Add-Type -AssemblyName System.Drawing

# Matches the favicon: rounded square in --deep, house in a warm off-white.
$deep  = [System.Drawing.ColorTranslator]::FromHtml('#173a3d')
$cream = [System.Drawing.ColorTranslator]::FromHtml('#f7f4eb')
$sizes = 16, 32, 48, 64, 128, 256

function New-Png([int]$size) {
    $scale = $size / 64.0
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Rounded square background (rx=14 in the 64-unit viewBox).
    $r = [float](14 * $scale)
    $d = $r * 2
    $w = [float]$size
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($w - $d, 0, $d, $d, 270, 90)
    $path.AddArc($w - $d, $w - $d, $d, $d, 0, 90)
    $path.AddArc(0, $w - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.SolidBrush($deep)
    $g.FillPath($brush, $path)

    # House: M15 31 32 17 49 31 v20 H37 V39 H27 v12 H15 Z
    $pts = @(15,31, 32,17, 49,31, 49,51, 37,51, 37,39, 27,39, 27,51, 15,51)
    $poly = New-Object 'System.Drawing.PointF[]' ($pts.Count / 2)
    for ($i = 0; $i -lt $poly.Length; $i++) {
        $poly[$i] = New-Object System.Drawing.PointF(($pts[$i*2] * $scale), ($pts[$i*2+1] * $scale))
    }
    $houseBrush = New-Object System.Drawing.SolidBrush($cream)
    $g.FillPolygon($houseBrush, $poly)

    $g.Dispose(); $brush.Dispose(); $houseBrush.Dispose(); $path.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    return $ms.ToArray()
}

$pngs = New-Object 'System.Collections.Generic.List[byte[]]'
foreach ($s in $sizes) {
    $bytes = New-Png $s
    if (-not $bytes -or $bytes.Length -lt 100) { throw "Failed to render the ${s}px image." }
    $pngs.Add($bytes)
}

# ICO container: 6-byte header, one 16-byte directory entry per image, then the
# PNG payloads. PNG-compressed entries are supported on Windows Vista onward.
$out = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($out)
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))   # 0 means 256
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))
    $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([uint16]1); $bw.Write([uint16]32)
    $bw.Write([uint32]$pngs[$i].Length)
    $bw.Write([uint32]$offset)
    $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $bw.Write($p) }
$bw.Flush()

$resolved = [System.IO.Path]::GetFullPath($OutFile)
[System.IO.File]::WriteAllBytes($resolved, $out.ToArray())
$bw.Dispose(); $out.Dispose()
Write-Host "Wrote $resolved ($((Get-Item $resolved).Length) bytes, sizes: $($sizes -join ', '))"
