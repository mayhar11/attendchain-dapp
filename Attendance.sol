/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Attendance {

    address public teacher;

    struct Student {
        string studentId;
        string name;
        address walletAddress;
        bool exists;
    }

    struct AttendanceRecord {
        string classId;
        string className;
        bool isPresent;
        uint256 timestamp;
    }

    struct ClassSession {
        string classId;
        string className;
        bool isActive;
        uint256 startTime;
        uint256 endTime;
    }

    mapping(address => Student) public students;
    mapping(address => AttendanceRecord[]) public attendanceRecords;
    mapping(string => ClassSession) public classes;
    
    address[] public studentList;
    string[] public classList;

    event StudentAdded(address student, string name, string studentId);
    event AttendanceMarked(address student, string classId, bool isPresent, uint256 timestamp);
    event ClassCreated(string classId, string className);
    event SessionStarted(string classId, uint256 timestamp);
    event SessionEnded(string classId, uint256 timestamp);

    constructor() {
        teacher = msg.sender;
    }

    modifier onlyTeacher() {
        require(msg.sender == teacher, "Only teacher can perform this action");
        _;
    }

    function createClass(string memory _classId, string memory _className) public onlyTeacher {
        require(bytes(classes[_classId].classId).length == 0, "Class already exists");
        classes[_classId] = ClassSession(_classId, _className, false, 0, 0);
        classList.push(_classId);
        emit ClassCreated(_classId, _className);
    }

    function startSession(string memory _classId) public onlyTeacher {
        require(bytes(classes[_classId].classId).length > 0, "Class does not exist");
        require(!classes[_classId].isActive, "Session already active");
        classes[_classId].isActive = true;
        classes[_classId].startTime = block.timestamp;
        emit SessionStarted(_classId, block.timestamp);
    }

    function endSession(string memory _classId) public onlyTeacher {
        require(classes[_classId].isActive, "No active session");
        classes[_classId].isActive = false;
        classes[_classId].endTime = block.timestamp;
        emit SessionEnded(_classId, block.timestamp);
    }

    function addStudent(address _student, string memory _studentId, string memory _name) public onlyTeacher {
        require(!students[_student].exists, "Student already exists");
        students[_student] = Student(_studentId, _name, _student, true);
        studentList.push(_student);
        emit StudentAdded(_student, _name, _studentId);
    }

    function markAttendance(address _student, string memory _classId, bool _isPresent) public onlyTeacher {
        require(students[_student].exists, "Student not registered");
        require(classes[_classId].isActive, "No active session for this class");
        attendanceRecords[_student].push(AttendanceRecord(_classId, classes[_classId].className, _isPresent, block.timestamp));
        emit AttendanceMarked(_student, _classId, _isPresent, block.timestamp);
    }

    function getAttendanceRecords(address _student) public view returns (AttendanceRecord[] memory) {
        return attendanceRecords[_student];
    }

    function getAttendancePercentage(address _student) public view returns (uint256) {
        uint256 total = attendanceRecords[_student].length;
        if (total == 0) return 0;
        uint256 present = 0;
        for (uint256 i = 0; i < total; i++) {
            if (attendanceRecords[_student][i].isPresent) {
                present++;
            }
        }
        return (present * 100) / total;
    }

    function getTotalStudents() public view returns (uint256) {
        return studentList.length;
    }

    function getTotalClasses() public view returns (uint256) {
        return classList.length;
    }

    function getStudent(address _student) public view returns (string memory, string memory, address) {
        require(students[_student].exists, "Student not found");
        return (students[_student].studentId, students[_student].name, students[_student].walletAddress);
    }
}