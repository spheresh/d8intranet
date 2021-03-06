'use strict';
/**
 * @ngdoc function
 * @name d8intranetApp.filter:filterByPosition
 * @description
 * # filterByPosition
 * Filter of the d8intranetApp
 */

angular.module('d8intranetApp')
  .service('getJsonData', function ($http, $timeout) {
    var url = '../../jsons/users.json';
    var users = [];
    var promise;

    var getJsonData = {
      getUsers: function () {
        if (users.length > 0) {
          console.log('I have users');
          return promise;
        }
        else {
          console.log('Don\'t have users... request');
          return getJsonData.async(url);
        }
      },
      async: function (url) {
        console.log('Getting users');
        // $http returns a promise, which has a then function, which also returns a promise

        promise = $http.get(url).then(function (response) {
          // The then function here is an opportunity to modify the response
          // The return value gets picked up by the then in the controller.
          users = response.data;
          // Clear users each 2 minutes
          $timeout(function () {
            users = [];
          }, '120000');
          console.log('Users are sent');
          return users;
        });
        // Return the promise to the controller
        return promise;
      }
    };

    return getJsonData;
  })

  .service('formatUserData', function () {
    var formatUserData = {
      // -----------------------------------------------------------------------
      // Method which return total days of vacations, sick days, etc. for single users
      //
      // @parameters:
      //   statisticsType [object] -  which contain formatted data
      //   datesType [string] - field which contain type of data which should
      //                        be formatted, for example field 'remoteWorkDays';
      getTotalDays: function (statisticsType, datesType) {
        var totalDaysYear = 0;

        angular.forEach(statisticsType, function (totalDays) {
          if (totalDays != undefined) {
            angular.forEach(totalDays[datesType], function (value, key) {
              if (key == 'totalMonthDays') {
                totalDaysYear += value;
              }
            });
          }
        });

        return totalDaysYear;
      },

      // Format data
      formatStatisticsData: function (formattedObject, statisticType) {
        var datesStatesCollection = {};

        var month = formatUserData.getMonthNumber(statisticType.start_date);
        var dateStart = formatUserData.getDateNumber(statisticType.start_date);
        var dateEnd = formatUserData.getDateNumber(statisticType.end_date);

        // If future formatted object is undefined, create it
        if (formattedObject[month] == undefined) {
          formattedObject[month] = {
            totalMonthDays: 0,
            multipleDates: [] // this property will be an array to collect multiple data
          };
        }

        datesStatesCollection[month] = {
          date: '',
          statusDate: ''
        };

        // If user has only ony booked date
        if (dateStart == dateEnd) {
          // Add date and status into new object
          // in case if there are several dates in one month
          datesStatesCollection[month].date = dateStart;
          datesStatesCollection[month].statusDate = statisticType.state;

          // Add object into new property - multiple dates
          // object goes into array
          formattedObject[month].multipleDates.push(datesStatesCollection[month]);
          formattedObject[month].totalMonthDays++;
        }

        // Calculate total days
        // output range between two dates
        else {
          formattedObject[month].totalMonthDays += dateEnd - dateStart + 1;
          datesStatesCollection[month].date = dateStart + '-' + dateEnd;
          datesStatesCollection[month].statusDate = statisticType.state;
          formattedObject[month].multipleDates.push(datesStatesCollection[month]);
        }

        return formattedObject[month];
      },

      // -----------------------------------------------------------------------
      // Method which return object with 12 month names
      //
      // @parameters:
      //   calendarMonths [object] -  which will be filled with property
      //    - monthName: Contain month short name;
      setMonths: function (calendarMonths) {
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "June",
          "July", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (var i = 0; i < 12; i++) {
          calendarMonths[i] = { "monthName": months[i] };
        }

        return calendarMonths;
      },


      formattedUser: function(users) {
        // Go through all users in JSON
        angular.forEach(users, function (employee) {

          var calendarMonths = {},
            sickDays = {},
            journeyDays = {},
            remoteWorkDays = {},
            dayOffDays = {},
            workOffDays = {},
            vacationDays = {};

          employee.timeRanges = {};

          var months = formatUserData.setMonths(calendarMonths);

          // Get Vacation days
          // ---------------------------------------------------------------------
          angular.forEach(employee.field_vacation, function (vacation) {
            var month = formatUserData.getMonthNumber(vacation.start_date);
            months[month].vacationDays = formatUserData.formatStatisticsData(vacationDays, vacation);
          });

          // Get DaysOff days
          // ---------------------------------------------------------------------
          angular.forEach(employee.field_dayoff, function (dayoff) {
            var month = formatUserData.getMonthNumber(dayoff.start_date);
            months[month].dayOffDays = formatUserData.formatStatisticsData(dayOffDays, dayoff);
          });
          //
          // Get Sick days
          // ---------------------------------------------------------------------
          angular.forEach(employee.field_sick, function (sick) {
            var month = formatUserData.getMonthNumber(sick.start_date);
            months[month].sickDays = formatUserData.formatStatisticsData(sickDays, sick);
          });

          // Get Duty Journey days
          // -------------------------------------------------------------------
          angular.forEach(employee.field_duty_journey, function (journey) {
            var month = formatUserData.getMonthNumber(journey.start_date);
            months[month].journeyDays = formatUserData.formatStatisticsData(journeyDays, journey);
          });

          // Get Remote work days
          // -------------------------------------------------------------------
          angular.forEach(employee.field_remote_work, function (remoteWork) {
            var month = formatUserData.getMonthNumber(remoteWork.start_date);
            months[month].remoteWorkDays = formatUserData.formatStatisticsData(remoteWorkDays, remoteWork);
          });

          // Get WorkOff work days
          // -------------------------------------------------------------------
          angular.forEach(employee.field_work_off, function (workOff) {
            var month = formatUserData.getMonthNumber(workOff.start_date);
            months[month].workOffDays = formatUserData.formatStatisticsData(workOffDays, workOff);
          });

          // Add new property into main employee object
          // which collect all table data for each user.
          employee.calendarMonths = months;

          // Add property with sum of Vacations, Days off, etc. fields
          employee.timeRanges.totalVacation = formatUserData.getTotalDays(months, 'vacationDays');
          employee.timeRanges.totalDaysOff = formatUserData.getTotalDays(months, 'dayOffDays');
          employee.timeRanges.totalWorkOff = formatUserData.getTotalDays(months, 'workOffDays');
          employee.timeRanges.totalSick = formatUserData.getTotalDays(months, 'sickDays');
          employee.timeRanges.totalJourney = formatUserData.getTotalDays(months, 'journeyDays');
          employee.timeRanges.totalRemoteWork = formatUserData.getTotalDays(months, 'remoteWorkDays');
        });
      },


      // -----------------------------------------------------------------------
      // Method which return month number
      // Accepted parameter - Timestamp, example: 1420070400 [01/01/2015]
      // return 01

      getMonthNumber: function (timestamp) {
        return new Date(timestamp * 1000).getMonth();
      },

      // -----------------------------------------------------------------------
      // Method which return date number
      // Accepted parameter - Timestamp, example: 1420070400 [01/01/2015]
      // return 01

      getDateNumber: function (timestamp) {
        return new Date(timestamp * 1000).getDate();
      },

      // -----------------------------------------------------------------------
      // Method which return date number
      // Accepted parameter - Timestamp, example: 1420070400 [01/01/2015]
      // return 2015

      getYearNumber: function(timestamp) {
      return new Date(timestamp * 1000).getFullYear();
    }
    };
    return formatUserData;
  });
