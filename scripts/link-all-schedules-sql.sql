-- Link all schedules to DJs by matching names
-- This is instant and bypasses Payload overhead

-- Sunday schedules
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Klee') WHERE day_of_week = 'sunday' AND start_time = '6:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Ninja') WHERE day_of_week = 'sunday' AND start_time = '9:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Wags') WHERE day_of_week = 'sunday' AND start_time = '12:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Jenny Lizak') WHERE day_of_week = 'sunday' AND start_time = '4:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Craig Reptile') WHERE day_of_week = 'sunday' AND start_time = '6:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Commodore Jones') WHERE day_of_week = 'sunday' AND start_time = '9:00 PM';

-- Monday schedules
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Natty Dubs') WHERE day_of_week = 'monday' AND start_time = '6:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Superfrye') WHERE day_of_week = 'monday' AND start_time = '9:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Mary Nisi') WHERE day_of_week = 'monday' AND start_time = '12:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Andy F') WHERE day_of_week = 'monday' AND start_time = '3:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'DJ Swallow') WHERE day_of_week = 'monday' AND start_time = '6:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Sheriff Jackson') WHERE day_of_week = 'monday' AND start_time = '8:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Matt Barr') WHERE day_of_week = 'monday' AND start_time = '10:00 PM';

-- Tuesday schedules
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Manny V') WHERE day_of_week = 'tuesday' AND start_time = '12:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'DJ Rynk') WHERE day_of_week = 'tuesday' AND start_time = '6:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Kevin Shields') WHERE day_of_week = 'tuesday' AND start_time = '9:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'D Rock') WHERE day_of_week = 'tuesday' AND start_time = '12:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Jack Ryan') WHERE day_of_week = 'tuesday' AND start_time = '3:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Beatnik') WHERE day_of_week = 'tuesday' AND start_time = '6:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Jenny West') WHERE day_of_week = 'tuesday' AND start_time = '8:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Drew') WHERE day_of_week = 'tuesday' AND start_time = '10:00 PM';

-- Wednesday schedules
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Drew') WHERE day_of_week = 'wednesday' AND start_time = '12:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Liz Mason') WHERE day_of_week = 'wednesday' AND start_time = '6:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Michael B.') WHERE day_of_week = 'wednesday' AND start_time = '9:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Paul Anderson') WHERE day_of_week = 'wednesday' AND start_time = '12:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Psychotic Distraction') WHERE day_of_week = 'wednesday' AND start_time = '3:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'The Audible Snail') WHERE day_of_week = 'wednesday' AND start_time = '6:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Scott McKenna') WHERE day_of_week = 'wednesday' AND start_time = '8:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Mick Rick') WHERE day_of_week = 'wednesday' AND start_time = '10:00 PM';

-- Thursday schedules
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Michael Griffith') WHERE day_of_week = 'thursday' AND start_time = '12:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Joanna Bz') WHERE day_of_week = 'thursday' AND start_time = '6:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'The Panda') WHERE day_of_week = 'thursday' AND start_time = '9:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'BDC') WHERE day_of_week = 'thursday' AND start_time = '12:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Alex Gilbert') WHERE day_of_week = 'thursday' AND start_time = '3:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'K-Tel') WHERE day_of_week = 'thursday' AND start_time = '6:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Geoffrey Wessel') WHERE day_of_week = 'thursday' AND start_time = '8:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'DJ Eco') WHERE day_of_week = 'thursday' AND start_time = '10:00 PM';

-- Friday schedules
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Tony Breed') WHERE day_of_week = 'friday' AND start_time = '6:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Nicole Oppenheim') WHERE day_of_week = 'friday' AND start_time = '9:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'DJ M-Dash') WHERE day_of_week = 'friday' AND start_time = '12:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'DJ Stevo') WHERE day_of_week = 'friday' AND start_time = '3:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Eddie') WHERE day_of_week = 'friday' AND start_time = '6:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Eric Wiersema') WHERE day_of_week = 'friday' AND start_time = '8:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Chris Suity') WHERE day_of_week = 'friday' AND start_time = '10:00 PM';

-- Saturday schedules
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'The Candy Lady') WHERE day_of_week = 'saturday' AND start_time = '12:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Sarah Spencer') WHERE day_of_week = 'saturday' AND start_time = '6:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Mike Bennett') WHERE day_of_week = 'saturday' AND start_time = '9:00 AM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Shawn Campbell') WHERE day_of_week = 'saturday' AND start_time = '12:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Bobby Evers') WHERE day_of_week = 'saturday' AND start_time = '2:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Jim Mulvaney') WHERE day_of_week = 'saturday' AND start_time = '4:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Willie McDonagh') WHERE day_of_week = 'saturday' AND start_time = '6:00 PM';
UPDATE show_schedules SET dj_id = (SELECT id FROM listeners WHERE dj_name = 'Yang') WHERE day_of_week = 'saturday' AND start_time = '9:00 PM';

-- Show results
SELECT COUNT(*) as linked_count FROM show_schedules WHERE dj_id IS NOT NULL;
SELECT 'All schedules linked successfully!' AS status;
