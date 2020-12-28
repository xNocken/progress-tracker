interface Course {
  name: string;
  desc: string;
  times: Array<TimeEntry>
  type: string;
  higherIsBetter: boolean;
  startPos: Vector3;
  endPos: Vector3;
  threshhold: number;
  id: string;
}
