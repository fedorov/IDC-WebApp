/**
 *
 * Copyright 2020, Institute for Systems Biology
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

require.config({
    baseUrl: STATIC_FILES_URL + 'js/',
    paths: {
        jquery: 'libs/jquery-1.11.1.min',
        jqueryui: 'libs/jquery-ui.min',
        underscore: 'libs/underscore-min',
        base: 'base',
        rawSvg: 'sapien/raw-svg',
        d3: 'libs/d3.v5.min'
    },
    shim: {
        'jqueryui': ['jquery'],
    }
});

require([
    'jquery',
    'rawSvg',
    'd3'
], function($, rawsvg, d3) {

    let colorCodes = {
      'Adrenal Gland': 'rgb(190, 48, 44)',
      'Bile Duct': 'rgb(213, 141, 0)',
      Bladder: 'rgb(105, 161, 236)',
      Blood: 'rgb(246, 40, 12)',
      Bone: 'rgb(156, 156, 156)',
      'Bone Marrow': 'rgb(240, 238, 55)',
      Brain: 'rgb(23, 153, 227)',
      Breast: 'rgb(223, 46, 189)',
      Cervix: 'rgb(215, 33, 93)',
      Colorectal: 'rgb(240, 119, 59)',
      Esophagus: 'rgb(52, 133, 34)',
      Eye: 'rgb(233, 110, 31)',
      'Head and Neck': 'rgb(240, 142, 26)',
      Kidney: 'rgb(38, 193, 86)',
      Liver: 'rgb(67, 221, 207)',
      Lung: 'rgb(158, 9, 219)',
      'Lymph Nodes': 'rgb(222, 61, 211)',
      'Nervous System': 'rgb(27, 114, 246)',
      Ovary: 'rgb(68, 213, 45)',
      Pancreas: 'rgb(199, 54, 207)',
      Pleura: 'rgb(215, 188, 88)',
      Prostate: 'rgb(60, 166, 205)',
      Skin: 'rgb(245, 42, 182)',
      'Soft Tissue': 'rgb(228, 222, 62)',
      Stomach: 'rgb(222, 175, 53)',
      Testis: 'rgb(218, 125, 58)',
      Thymus: 'rgb(61, 223, 204)',
      Thyroid: 'rgb(224, 75, 123)',
      Uterus: 'rgb(245, 97, 154)',
    };

    let data = case_counts.sort(function(a,b){
        let aSite = a['site'].toLowerCase();
        let bSite = b['site'].toLowerCase();
        if( aSite == bSite) {
            return 0;
        }
        if(aSite < bSite) {
            return -1;
        }
        return 1;
    });

    function clickHandler() {
      console.debug("HANDLE IT");
    };

    function mouseOutHandler() {
      console.debug("OUT");
    };

    function mouseOverHandler() {
      console.debug("OVER");
    };

  let root = $('#human-body-root');

  if (!root) throw 'Must select an existing element!';

  root.prepend(rawsvg.buildHumanBody(null,null,'Cases by Primary Site'));

  let width = 400;
  let height = 530;
  let labelSize ='12px';
  let tickInterval = 500;

  let offsetLeft = 0;
  let offsetTop = 0;
  let primarySiteKey = 'site';
  let caseCountKey = 'cases';
  let fileCountKey = 'fileCount';

  const plotHeight = height - 30;
  const barStartOffset = 130;
  const barWidth = width - barStartOffset;
  const maxCases = Math.max(...data.map(d => d[caseCountKey]));
  const numberOfVerticalAxis = Math.floor(maxCases / tickInterval) + 1;
  const toClassName = key => key.split(' ').join('-');
  const halfPixel = 0.5;

  // The Bar Chart
  const svg = d3
    .select('#human-body-root')
    .append('svg')
    .attr('class', 'chart')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .append('g');

  // Bar Heights
  const y = d3
    .scaleBand()
    .domain(data.map(x => x[primarySiteKey]))
    .range([plotHeight, 0]);

  // Bar Widths
  const x = d3
    .scaleLinear()
    .domain([0, maxCases * 1.1])
    .range([0, barWidth]);

  // Horizontal Axis
  svg
    .append('line')
    .attr('stroke', 'rgba(255, 255, 255, 0.8)')
    .attr('stroke-width', 4)
    .attr('x1', barStartOffset)
    .attr('x2', width)
    .attr('y1', plotHeight + halfPixel)
    .attr('y2', plotHeight + halfPixel);

  const xAxisLabels = svg.append('g').attr('id', 'xAxisLabels');

  // Vertical Axis
  for (let i = 0; i < numberOfVerticalAxis; i++) {
    svg
      .append('line')
      .attr('stroke', `rgba(255, 255, 255, 0.5)`)
      .attr('stroke-width', 4)
      .attr('x1', (x(tickInterval) * i) + barStartOffset)
      .attr('x2', (x(tickInterval) * i) + barStartOffset)
      .attr('y1', 0)
      .attr('y2', plotHeight);

    if (i) { // Don't display zero
      xAxisLabels
        .append('text')
        .attr('y', plotHeight + 20)
        .attr('x', (x(tickInterval) * i) + barStartOffset)
        .attr('fill', 'rgb(10, 10, 10)')
        .attr('font-size', '12px')
        .style('text-anchor', 'middle')
        .text(d => (tickInterval * i).toLocaleString());
    }
  }

  // Primary Site Labels
  svg
    .append('g')
    .attr('id', 'primarySiteLabels')
    .selectAll('text')
    .data(data)
    .enter()
    .append('text')
    .attr('class', d => `primary-site-label-${toClassName(d[primarySiteKey])}`)
    .attr('y', (d, i) => ((plotHeight / data.length) * i) + 20)
    .attr('x', barStartOffset - 10)
    .attr('fill', 'rgb(10, 10, 10)')
    .attr('font-size', labelSize)
    .style('text-anchor', 'end')
    .text(d => d[primarySiteKey])
    .on('mouseover', function (d, i) { // needs `this`
      const organSelector = toClassName(d[primarySiteKey]);
      const organ = document.getElementById(organSelector);
      if (organ) organ.style.opacity = 1;

      d3.select(this)
        .style('cursor', 'pointer');

      d3.select(`.bar-${toClassName(d[primarySiteKey])}`)
        .transition(300)
        .attr('fill', d => {
          const hsl = d3.hsl(d.color);
          hsl.s = 1;
          hsl.l = 0.7;
          return d3.hsl(hsl);
        });

      d3.select(`.primary-site-label-${toClassName(d[primarySiteKey])}`)
        .transition(300)
        .attr('fill', 'white');

      if (mouseOverHandler) mouseOverHandler(d);
      else {
        tooltip
          .style('opacity', 1)
          .html(`
            <div style="color: #bb0e3d">${d._key}</div>
            <div style="font-size: 12px; color: rgb(20, 20, 20)">
              ${d[caseCountKey]} cases (${d[fileCountKey] || 100} files)
            </div>
          `)
          .style('left', `${d3.event.pageX - offsetLeft}px`)
          .style('top', `${d3.event.pageY - offsetTop - 86}px`)
          .style('transform', 'translateX(-50%)')
          .style('transform', 'translateX(-50%)')
          .style('z-index', '99999');
      }
    })
    .on('mouseout', (d, i) => { // needs `this`
      const organSelector = toClassName(d[primarySiteKey]);
      const organ = document.getElementById(organSelector);
      if (organ) organ.style.opacity = 0;

      d3.select(`.bar-${toClassName(d[primarySiteKey])}`)
        .transition(300)
        .attr('fill', d => d.color);

      d3.select(`.primary-site-label-${toClassName(d[primarySiteKey])}`)
        .transition(300)
        .attr('fill', 'rgb(20, 20, 20)');

      if (mouseOutHandler) mouseOutHandler(d);
      else tooltip.style('opacity', 0);
    })
    .on('click', clickHandler);

  // Bar Chart Tootlip
  let tooltip = d3
    .select('#human-body-root')
    .append('div')
    .style('position', 'absolute')
    .style('opacity', 0)
    .style('background-color', 'white')
    .style('padding', '10px')
    .style('box-shadow', '0 2px 5px 0 rgba(0,0,0,0.16),0 2px 10px 0 rgba(0,0,0,0.12)')
    .style('border-radius', '5px')
    .style('border', '1px solid rgba(40, 40, 40)')
    .style('pointer-events', 'none');

  // Horizontal Bars
  svg
    .append('g')
    .attr('id', 'barGroup')
    .selectAll('g')
    .data(data)
    .enter()
    .append('g')
    .append('rect')
    .attr('class', d => `bar-group-${toClassName(d[primarySiteKey])}`)
    .attr('y', (d, i) => ((plotHeight / data.length) * i) + 6)
    .attr('x', barStartOffset + halfPixel)
    .attr('width', d => x(d[caseCountKey]))
    .attr('height', y.bandwidth() - 6)
    .attr('fill', (d, i) => { d.color = colorCodes[d[primarySiteKey]]; return d.color; })
    .attr('class', d => `bar-${toClassName(d[primarySiteKey])}`)
    .on('mouseover', function (d, i) { // needs `this`
      const organSelector = toClassName(d[primarySiteKey]);
      const organ = document.getElementById(organSelector);
      if (organ) organ.style.opacity = 1;

      d3.select(this)
        .attr('cursor', 'pointer')
        .transition(300)
        .attr('fill', d => {
          const hsl = d3.hsl(d.color);
          hsl.s = 1;
          hsl.l = 0.7;
          return d3.hsl(hsl);
        });

      d3.select(`.primary-site-label-${toClassName(d[primarySiteKey])}`)
        .transition(300)
        .attr('fill', 'white');

      if (mouseOverHandler) mouseOverHandler(d);
      else {
        tooltip
          .style('opacity', 1)
          .html(`
            <div style="color: #bb0e3d">${d._key}</div>
            <div style="font-size: 12px; color: rgb(20, 20, 20)">
              ${d[caseCountKey].toLocaleString()} cases, (${d[fileCountKey].toLocaleString() || 100} files)
            </div>
          `)
          .style('left', `${d3.event.pageX - offsetLeft}px`)
          .style('top', `${d3.event.pageY - offsetTop - 86}px`)
          .style('transform', 'translateX(-50%)')
          .style('transform', 'translateX(-50%)')
          .style('z-index', '99999');
      }
    })
    .on('mouseout', function (d, i) { // needs `this`
      const organSelector = toClassName(d[primarySiteKey]);
      const organ = document.getElementById(organSelector);
      if (organ) organ.style.opacity = 0;

      d3.select(this)
        .transition(300)
        .attr('fill', d => d.color);

      d3.select(`.primary-site-label-${toClassName(d[primarySiteKey])}`)
        .transition(300)
        .attr('fill', 'rgb(20, 20, 20)');

      if (mouseOutHandler) mouseOutHandler(d);
      else tooltip.style('opacity', 0);
    })
    .on('click', clickHandler);

  const svgs = document.querySelectorAll('#human-body-highlights svg');

  [].forEach.call(svgs, svg => {
    svg.addEventListener('click', function () {
      clickHandler({ _key: this.id });
    });

    svg.addEventListener('mouseover', function (event) { // needs `this`
      this.style.opacity = 1;

      d3.select(`.primary-site-label-${this.id}`)
        .transition(300)
        .attr('fill', 'white');

      d3.select(`.bar-${this.id}`)
        .attr('cursor', 'pointer')
        .transition(300)
        .attr('fill', d => {
          // hacks
          if (mouseOverHandler) mouseOverHandler(d);
          else {
            tooltip
              .style('opacity', 1)
              .html(`
                <div style="color: #bb0e3d">${d[primarySiteKey]}</div>
                <div style="font-size: 12px; color: rgb(20, 20, 20)">
                  ${d[caseCountKey].toLocaleString()} cases (${d[fileCountKey].toLocaleString() || 100} files)
                </div>
              `)
              .style('left', `${event.clientX - offsetLeft}px`)
              .style('top', `${event.clientY - offsetTop - 86}px`)
              .style('transform', 'translateX(-50%)')
              .style('z-index', '99999');
          }

          const hsl = d3.hsl(d.color);
          hsl.s = 1;
          hsl.l = 0.7;
          return d3.hsl(hsl);
        });
    });

    svg.addEventListener('mouseout', function () { // needs `this`
      this.style.opacity = 0;

      d3.select(`.primary-site-label-${this.id}`)
        .transition(300)
        .attr('fill', 'rgb(20, 20, 20)');

      d3.select(`.bar-${this.id}`)
        .transition(300)
        .attr('fill', d => {
          if (mouseOutHandler) mouseOutHandler(d);
          else tooltip.style('opacity', 0);
          return d.color;
        });
    });
  });

});