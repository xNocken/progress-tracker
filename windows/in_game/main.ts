import standard from './standard';

import * as $ from 'jquery';
let createCount = 0;
const recording = {};
let startPos: Vector3 = null;
let endPos: Vector3 = null;
let globalData: Data;

let pos: Vector3 = {
  x: 0,
  y: 0,
  z: 0,
};

const generateUId = (): string => {
  let id = 0;

  id += new Date().getTime();
  id <<= 10;
  id += createCount++;

  return id.toString();
};

const saveData = (data: Data): void => {
  const newData: Data = {
    ...data,
    course: data.course.filter((a) => a),
  }
  globalData = newData;

  window.localStorage.setItem('data', JSON.stringify(newData));
};

const getData = (): Data => {
  if (globalData) {
    return globalData;
  }

  let data = JSON.parse(window.localStorage.getItem('data')) as Data;

  if (!data) {
    data = {} as Data;
    data.course = [];
  }

  data.course = data.course.map((course) => ({
    ...course,
    id: course.id || generateUId(),
  }))

  saveData(data);

  return data;
};

const addScore = (courseId: string, score: number) => {
  let data: Data = getData();

  for (let i = 0; i < data.course.length; i++) {
    if (data.course[i].id === courseId) {
      data.course[i].times.push({
        id: generateUId(),
        score,
        timeOfRecording: new Date(),
      })
    }
  }

  saveData(data);
};

const startRecording = (id: string) => {
  if (recording[id]) {
    return;
  }

  recording[id] = new Date().getTime();
};

const stopRecording = (id: string) => {
  if (!recording[id]) {
    return;
  }

  const diff = new Date().getTime() - recording[id];
  delete recording[id];

  addScore(id, diff);
};

const toggleRecording = (id: string) => {
  if (recording[id]) {
    stopRecording(id);
    return false;
  } else {
    startRecording(id);
    return true;
  }
};

const convertToLength = (nmber: number, length: number = 2): string => {
  const stringg = nmber.toString();

  return `${'0'.repeat(length - stringg.length)}${stringg}`;
};

const convertToTime = (ms: number, useMs: boolean = false): string => {
  const time: Date = new Date(ms);

  return `${convertToLength(time.getMinutes() + ((time.getHours() - 1) * 60))}:${convertToLength(time.getSeconds())}${useMs ? '.' + convertToLength(time.getMilliseconds(), 3) : ''}`;
};

const loadDetail = (id: string) => {
  let data: Data = getData();
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

  targetCourse.times.slice(0, targetCourse.times.length).sort((a, b) => new Date(b.timeOfRecording).getTime() - new Date(a.timeOfRecording).getTime()).forEach((time: TimeEntry) => {
    $list.append(template
      .replace(':score', targetCourse.type === 'time' ? convertToTime(time.score, true) : time.score.toString())
      .replace(':recTime', new Date(time.timeOfRecording).toLocaleString())
      .replace(':id', time.id)
    )
  });

  $list.find('.delete').on('click', ({target}) => {
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
  let data: Data = getData();
  $('.screen').hide();
  $('.courses').show();

  const $courses = $('.courses').find('.list');
  const template = $('template#courses').html();

  $courses.empty();

  data.course.forEach((course: Course) => {
    let bestScore: string = 'No scores Recorded';
    let tempScore: number;
    let lastScore: string;

    course.times.forEach((time: TimeEntry) => {
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
  let data: Data = getData();

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
      } as Course)

      saveData(data);
      loadCourses();
    })
  });

  $('#add-score-modal .add').on('click', ({ target }) => {
    const $target = $(target);
    const id = $target.closest('#add-score-modal').data('id');
    const score = $target.closest('#add-score-modal').find('.score').val();

    addScore(id, parseInt(score.toString()));
    loadDetail(id);
  });

  loadCourses();
};

const onLocation = (location: Vector3) => {
  let data: Data = getData();
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
