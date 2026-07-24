/** Geometria de gráfico de linha em SVG — sem lib de gráfico externa (ver CLAUDE.md: app é
 * EJS + CSS/SVG puro, sem build step de front-end). Eixo X é proporcional ao valor numérico de
 * `x` (ex.: timestamp em ms), não ao índice do ponto — mais fiel a "Tempo" no relatório
 * Valor x Tempo do que um espaçamento uniforme por atividade. */

export interface ChartPoint {
  x: number;
  y: number;
}

export interface LineChartGeometry {
  /** Atributo `points` de um <polyline>; vazio quando há menos de 2 pontos (nada a linkar). */
  points: string;
  /** Um círculo por ponto de entrada, na mesma ordem/índice dos pontos recebidos. */
  circles: ChartPoint[];
  minY: number;
  maxY: number;
  /** Largura total do viewBox — exposta pra quem posiciona elementos HTML sobre o gráfico (ex.:
   * botão de tooltip) converter x/y em porcentagem sem duplicar o valor de `width`. */
  totalWidth: number;
  /** Altura total do viewBox (área do gráfico + faixa reservada pras marcações de eixo X). */
  totalHeight: number;
  /** Coordenada Y onde as marcações de eixo X (data de cada ponto) devem ser desenhadas. */
  axisLabelY: number;
}

interface ChartOptions {
  width?: number;
  height?: number;
  padding?: number;
  /** Faixa extra reservada abaixo da área do gráfico pras marcações de tempo (eixo X). */
  labelHeight?: number;
}

/** Normaliza `x`/`y` para as coordenadas de um viewBox `0 0 width (height + labelHeight)`, com
 * `padding` nas bordas da área do gráfico. Robusto a 0/1 ponto e a todos os valores de x (ou de
 * y) iguais, casos em que uma divisão pela amplitude (max - min) daria divisão por zero. */
export function buildLineChartGeometry(
  pontos: ChartPoint[],
  { width = 600, height = 170, padding = 20, labelHeight = 30 }: ChartOptions = {},
): LineChartGeometry {
  const totalHeight = height + labelHeight;
  // Baseline do texto um pouco abaixo do topo da faixa reservada, com espaço pro texto não
  // colar na borda inferior do viewBox.
  const axisLabelY = height + labelHeight * 0.7;

  if (pontos.length === 0) {
    return { points: '', circles: [], minY: 0, maxY: 0, totalWidth: width, totalHeight, axisLabelY };
  }

  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const circles = pontos.map((p) => {
    // rangeX/rangeY === 0 (ponto único ou todos os valores iguais): centraliza no eixo em vez
    // de dividir por zero.
    const nx = rangeX === 0 ? 0.5 : (p.x - minX) / rangeX;
    const ny = rangeY === 0 ? 0.5 : (p.y - minY) / rangeY;
    return {
      x: padding + nx * innerWidth,
      // SVG cresce pra baixo — inverte pra que o maior valor fique no topo.
      y: padding + (1 - ny) * innerHeight,
    };
  });

  const points = circles.length < 2 ? '' : circles.map((c) => `${c.x},${c.y}`).join(' ');

  return { points, circles, minY, maxY, totalWidth: width, totalHeight, axisLabelY };
}
