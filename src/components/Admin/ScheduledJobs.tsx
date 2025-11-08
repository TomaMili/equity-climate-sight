import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Play, Pause, Trash2, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  jobname: string;
  active: boolean;
}

export function ScheduledJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_cron_jobs');
      
      if (error) throw error;
      
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching cron jobs:', error);
      toast({
        title: 'Error Loading Jobs',
        description: error.message || 'Failed to fetch scheduled jobs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const toggleJob = async (jobId: number, currentState: boolean) => {
    try {
      const { error } = await supabase.rpc('toggle_cron_job', {
        job_id: jobId,
        new_active_state: !currentState,
      });

      if (error) throw error;

      toast({
        title: currentState ? 'Job Paused' : 'Job Activated',
        description: `The scheduled job has been ${currentState ? 'paused' : 'activated'}`,
      });

      fetchJobs();
    } catch (error: any) {
      console.error('Error toggling job:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle job',
        variant: 'destructive',
      });
    }
  };

  const deleteJob = async (jobId: number) => {
    try {
      const { error } = await supabase.rpc('delete_cron_job', { job_id: jobId });

      if (error) throw error;

      toast({
        title: 'Job Deleted',
        description: 'The scheduled job has been removed',
      });

      fetchJobs();
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete job',
        variant: 'destructive',
      });
    }
  };

  const formatSchedule = (schedule: string) => {
    const parts = schedule.split(' ');
    if (parts.length !== 5) return schedule;
    
    const [minute, hour] = parts;
    
    if (minute === '0' && hour === '2') {
      return 'Daily at 2:00 AM UTC (Countries)';
    }
    if (minute === '30' && hour === '2') {
      return 'Daily at 2:30 AM UTC (Regions)';
    }
    
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC daily`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Scheduled Jobs
          </h3>
          <p className="text-sm text-muted-foreground">
            Automatic data refresh schedule
          </p>
        </div>
        <Button
          onClick={fetchJobs}
          disabled={isLoading}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading scheduled jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No scheduled jobs found
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.jobid}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">
                      {job.jobname}
                    </span>
                    <Badge variant={job.active ? 'default' : 'secondary'}>
                      {job.active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatSchedule(job.schedule)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => toggleJob(job.jobid, job.active)}
                  size="sm"
                  variant="ghost"
                  title={job.active ? 'Pause job' : 'Activate job'}
                >
                  {job.active ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Delete job"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Scheduled Job?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the scheduled job. You'll need to
                        recreate it if you want automatic updates again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteJob(job.jobid)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Jobs run automatically on schedule. Countries are initialized first (2:00 AM UTC), 
          followed by regions 30 minutes later (2:30 AM UTC) to ensure data consistency.
        </p>
      </div>
    </Card>
  );
}
