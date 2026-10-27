export const DRAFT_STAMP = "Unverified AI-assisted draft";
export const JUW = {
  name: "JUW-MicroSlides",
  canonicalUrl: "https://tajoor621.github.io/JUW-MicroSlides/",
  version: "V6.2.1",
  crest: `${import.meta.env.BASE_URL}juw-crest-transparent.svg`,
  crestMark: `${import.meta.env.BASE_URL}juw-crest-transparent.svg`,
  deptSeal: `${import.meta.env.BASE_URL}juw-dept-seal.svg?v=5`,
  microscope: `${import.meta.env.BASE_URL}juw-microscope.png?v=crystal`,
  course: "Microbial Enzyme Technology",
  courseCode: "MIC-4511",
  preparedBy: "Ms. Noor",
  department: "Department of Microbiology",
} as const;

export function lectureMeta(partial?: {
  course?: string;
  courseCode?: string;
  preparedBy?: string;
  department?: string;
}) {
  return {
    course: partial?.course?.trim() ?? JUW.course,
    courseCode: partial?.courseCode?.trim() ?? JUW.courseCode,
    preparedBy: partial?.preparedBy?.trim() ?? JUW.preparedBy,
    department: partial?.department?.trim() ?? JUW.department,
  };
}
