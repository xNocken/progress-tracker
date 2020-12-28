import Player from '../../classes/Player';
import standard from './standard';

import * as $ from 'jquery';
let createCount = 0;

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
  globalData = data;
  window.localStorage.setItem('data', JSON.stringify(data));
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

const loadDetail = (id: string) => {
  let data: Data = getData();
  const targetCourse = data.course.filter((course) => course.id === id)[0];

  if (!targetCourse) {
    console.error('Course with id', id, 'not found')
    return;
  }

  $('.screen').hide();
  $('.detail').show();

  $('.detail').find('#back').on('click', () => loadCourses())
  $('.detail').find('#add-score').off('click')
  $('.detail').find('#add-score').on('click', () => addScore(targetCourse.id, Math.floor(Math.random() * 10000)))

  const $list = $('.detail').find('.list');

  $('.detail').find('#start-recording').css('display', targetCourse.type === 'time' ? 'inline-block' : 'none');

  $list.find('.entry').remove();
  const template = $('template#times').html();

  targetCourse.times.sort((a, b) => new Date(b.timeOfRecording).getTime() - new Date(a.timeOfRecording).getTime()).forEach((time: TimeEntry) => {
    $list.append(template
      .replace(':score', time.score.toString())
      .replace(':recTime', new Date(time.timeOfRecording).toLocaleString())
    )
  });
};

const loadCourses = () => {
  let data: Data = getData();
  $('.screen').hide();
  $('.courses').show();

  const $courses = $('.courses').find('.list');
  const template = $('#courses').html();

  $courses.empty();

  data.course.forEach((course: Course) => {
    let bestScore: string = 'No scores Recorded';
    let tempScore: number;

    course.times.forEach((time: TimeEntry) => {
      if (course.higherIsBetter && (time.score > tempScore || !tempScore)) {
        tempScore = time.score;
      } else if (!course.higherIsBetter && (time.score < tempScore || !tempScore)) {
        tempScore = time.score;
      }
    });

    switch (course.type) {
      case 'time':
        const time: Date = new Date(tempScore);
        bestScore = `${time.getMinutes() + (time.getHours() * 60)}:${time.getSeconds()}`;
        break;

      default:
        bestScore = tempScore?.toString();
    }

    const $course = $(template
      .replace(':name', course.name)
      .replace(':desc', course.desc || '')
      .replace(':lastTime', course.times[course.times.length - 1]?.score.toString() || 'No score recorded')
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
    let startPos: Vector3 = null;
    let endPos: Vector3 = null;
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

  loadCourses();
};

const onLocation = (location: Vector3) => {
  pos = location;
};

export default {
  ...standard,
  onLocation,
  onLoad,
};
