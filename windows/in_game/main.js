import standard from './standard';
import Chart from 'chart.js';

import * as $ from 'jquery';
let createCount = 0;
const recording = {};
let startPos = null;
let endPos = null;
let globalData;

const labelMap = {
  time: 'Time in seconds',
  fallback: 'Score'
}

const responseMap = [
  '',
  'Congrats! You got a new Personal Best!',
  'Good Job! You equaled your PB.'
]

let pos = {
  x: 0,
  y: 0,
  z: 0,
};

const generateUId = () => {
  let id = 0;

  id += new Date().getTime();
  id <<= 10;
  id += createCount++;

  return id.toString();
};

const saveData = (data) => {
  const newData = {
    ...data,
    course: data.course.filter((a) => a),
  }
  globalData = newData;

  window.localStorage.setItem('data', JSON.stringify(newData));
};

const getData = () => {
  if (globalData) {
    return globalData;
  }

  let data = JSON.parse(window.localStorage.getItem('data'));

  if (!data) {
    data = {};
    data.course = [];
  }

  data.course = data.course.map((course) => ({
    ...course,
    id: course.id || generateUId(),
  }))

  saveData(data);

  return data;
};

const addScore = (courseId, score) => {
  let data = getData();
  let scoreState = 0;

  for (let i = 0; i < data.course.length; i++) {
    if (data.course[i].id === courseId) {
      let highest = data.course[i].higherIsBetter ? 0 : Infinity;

      data.course[i].times.forEach((time) => {
        if (data.course[i].higherIsBetter) {
          if (highest < time.score) {
            highest = time.score;
          }
        } else {
          if (highest > time.score) {
            highest = time.score;
          }
        }
      });

      if (data.course[i].higherIsBetter) {
        if (highest < score) {
          scoreState = 1; // pb
        } else if (highest === score) {
          scoreState = 2; // equal
        }
      }

      data.course[i].times.push({
        id: generateUId(),
        score,
        timeOfRecording: new Date(),
      });

      break;
    }
  }

  saveData(data);

  return scoreState;
};

const startRecording = (id) => {
  if (recording[id]) {
    return;
  }

  recording[id] = new Date().getTime();
};

const stopRecording = (id) => {
  if (!recording[id]) {
    return;
  }

  const diff = new Date().getTime() - recording[id];
  delete recording[id];

  addScore(id, diff);
};

const toggleRecording = (id) => {
  if (recording[id]) {
    stopRecording(id);
    return false;
  } else {
    startRecording(id);
    return true;
  }
};

const convertToLength = (nmber, length = 2) => {
  const stringg = nmber.toString();

  return `${'0'.repeat(length - stringg.length)}${stringg}`;
};

const convertToTime = (ms, useMs = false) => {
  const time = new Date(ms);

  return `${convertToLength(time.getMinutes() + ((time.getHours() - 1) * 60))}:${convertToLength(time.getSeconds())}${useMs ? '.' + convertToLength(time.getMilliseconds(), 3) : ''}`;
};

const loadDetail = (id) => {
  let data = getData();
  const targetCourse = data.course.filter((course) => course.id === id)[0];
  const $detail = $('.detail');

  if (!targetCourse) {
    console.error('Course with id', id, 'not found');
    return;
  }

  $('.screen').hide();
  $detail.show();

  $detail.find('#back').on('click', () => loadCourses());
  $detail.find('#add-score').off('click');
  $detail.find('#add-score').on('click', () => $('#add-score-modal').show());
  $detail.find('#start-recording').off('click');
  $detail.find('#start-recording').on('click', () => $detail.find('#start-recording').text(toggleRecording(id) ? 'Stop recording' : 'Start recording'))
  $detail.find('#start-recording').text(recording[id] ? 'Stop recording' : 'Start recording');
  $detail.find('#delete-course').off('click');
  $detail.find('#delete-course').on('click', () => {
    data.course.forEach((course, index) => {
      if (course.id === id) {
        data.course.splice(index);
      }

      saveData(data);
      loadCourses();
    });
  })

  $('#add-score-modal').data('id', id);

  const $list = $detail.find('.list');

  $detail.find('#start-recording').css('display', targetCourse.type === 'time' ? 'inline-block' : 'none');

  $list.find('.entry').remove();
  const template = $('template#times').html();

  const days = {};
  const daysCount = {};

  targetCourse.times.slice(0).sort((a, b) => new Date(b.timeOfRecording).getTime() - new Date(a.timeOfRecording).getTime()).forEach((time) => {
    const date = new Date(time.timeOfRecording);
    const currentDay = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (!days[currentDay]) {
      days[currentDay] = time.score;
      daysCount[currentDay] = 1;
    }

    days[currentDay] += time.score;
    daysCount[currentDay] += 1;

    $list.append(template
      .replace(':score', targetCourse.type === 'time' ? convertToTime(time.score, true) : time.score.toString())
      .replace(':recTime', date.toLocaleString())
      .replace(':id', time.id)
    )
  });

  const labels = [];
  const dataa = [];

  Object.entries(days).reverse().forEach(([day, score]) => {
    const avaragescore = score / daysCount[day];
    labels.push(day);
    dataa.push(targetCourse.type === 'time' ? avaragescore / 1000 : avaragescore);
  });

  const ctx = $('#detail-graph')[0];

  var myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: labelMap[targetCourse.type] || labelMap.fallback,
        data: dataa,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
    }
  });

  $list.find('.delete').on('click', ({ target }) => {
    const $target = $(target);
    const timeId = $target.data('id').toString();

    if (timeId) {
      data.course.forEach((course, courseIndex) => {
        if (course.id === id) {
          course.times.forEach((time, timeIndex) => {
            if (time.id === timeId) {
              data.course[courseIndex].times.splice(timeIndex, 1);

              saveData(data);
              loadDetail(id);
            }
          })
        }
      })
    }
  })
};

const loadCourses = () => {
  let data = getData();
  $('.screen').hide();
  $('.courses').show();

  const $courses = $('.courses').find('.list');
  const template = $('template#courses').html();

  $courses.empty();

  data.course.forEach((course) => {
    let bestScore = 'No scores Recorded';
    let tempScore;
    let lastScore;

    course.times.forEach((time) => {
      if (course.higherIsBetter && (time.score > tempScore || !tempScore)) {
        tempScore = time.score;
      } else if (!course.higherIsBetter && (time.score < tempScore || !tempScore)) {
        tempScore = time.score;
      }
    });

    switch (course.type) {
      case 'time':
        if (!course.times.length) {
          break;
        }

        lastScore = convertToTime(course.times[course.times.length - 1].score);
        bestScore = convertToTime(tempScore);
        break;

      default:
        bestScore = tempScore?.toString();
        lastScore = course.times[course.times.length - 1]?.score.toString();
    }

    const $course = $(template
      .replace(':name', course.name)
      .replace(':desc', course.desc || '')
      .replace(':lastTime', lastScore || 'No score recorded')
      .replace(':bestTime', tempScore ? bestScore : 'No score recorded')
      .replace(':id', course.id));

    $course.on('click', () => {
      loadDetail(course.id);
    });
    $courses.append($course);
  });
};

const onLoad = () => {
  let data = getData();

  $('.modal-close').on('click', ({ target }) => {
    $(target).closest('.modal').hide();
  })

  const $add = $('#courses-add');

  $add.on('click', () => {
    const $courseModal = $('#add-course-modal');
    $courseModal.show();

    $courseModal.find('.startPosClear').on('click', () => {
      startPos = null;
      $courseModal.find('.startPosPreview').text('None');
    })
    $courseModal.find('.endPosClear').on('click', () => {
      endPos = null;
      $courseModal.find('.endPosPreview').text('None');
    })

    $courseModal.find('.startPos').on('click', () => {
      startPos = pos;
      $courseModal.find('.startPosPreview').text(`${pos.x}/${pos.y}/${pos.z}`);
    })
    $courseModal.find('.endPos').on('click', () => {
      endPos = pos;
      $courseModal.find('.endPosPreview').text(`${pos.x}/${pos.y}/${pos.z}`);
    })

    $courseModal.find('.add').off('click');
    $courseModal.find('.add').on('click', () => {
      data.course.push({
        name: $courseModal.find('.name').val(),
        desc: $courseModal.find('.desc').val(),
        times: [],
        type: $courseModal.find('.type').val(),
        higherIsBetter: $courseModal.find('.higherIsBetter').is(':checked'),
        startPos,
        endPos,
        threshhold: parseInt($courseModal.find('.threshhold').val().toString()) || 0,
        id: generateUId(),
      })

      saveData(data);
      loadCourses();
    })
  });

  $('#add-score-modal .add').on('click', ({ target }) => {
    const $target = $(target);
    const id = $target.closest('#add-score-modal').data('id');
    const score = $target.closest('#add-score-modal').find('.score').val();

    $('#add-score-modal .add-response').text(responseMap[addScore(id, parseInt(score.toString()))]);
    loadDetail(id);
  });

  loadCourses();
};

const onLocation = (location) => {
  let data = getData();
  pos = location;

  data.course.forEach((course) => {
    if (course.startPos && ((course.startPos.x + course.threshhold) > location.x && (course.startPos.x - course.threshhold) < location.x)
      && ((course.startPos.y + course.threshhold) > location.y && (course.startPos.y - course.threshhold) < location.y)
      && ((course.startPos.z + course.threshhold) > location.z && (course.startPos.z - course.threshhold) < location.z)) {
      startRecording(course.id);
    }

    if (course.endPos && course.endPos.x + course.threshhold > location.x && course.endPos.x - course.threshhold < location.x && course.endPos.y + course.threshhold > location.y && course.endPos.y - course.threshhold < location.y && course.endPos.z + course.threshhold > location.z && course.endPos.z - course.threshhold < location.z) {
      stopRecording(course.id);
    }
  });
};

export default {
  ...standard,
  onLocation,
  onLoad,
};
