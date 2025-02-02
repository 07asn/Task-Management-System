import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext"; 
import { getTasksFromFirebase, updateTaskStatusInFirebase } from "../services/taskService"; 
import CreateTaskForm from "../components/CreateTaskForm";
import EditTaskModal from "../components/ui/EditTaskModal";
import TaskColumn from "../components/TaskColumn";
import TaskFilters from "../components/TaskFilters";  
import TaskCard from "../components/TaskCard";

const statusConfig = {
  todo: { label: "To Do", color: "from-blue-50 to-blue-100" },
  "in-progress": { label: "In Progress", color: "from-yellow-50 to-yellow-100" },
  done: { label: "Done", color: "from-green-50 to-green-100" }
};

export default function TaskBoard() {
  const { user } = useAuth(); 
  const [tasks, setTasks] = useState([]);
  const [editTask, setEditTask] = useState(null);
  const [notification, setNotification] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  // Define filters (if needed)
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");

  // Fetch tasks from Firebase for the current user
  useEffect(() => {
    if (user && user.uid) {
      fetchUserTasks();
    }
  }, [user]);

  const fetchUserTasks = async () => {
    try {
      const allTasks = await getTasksFromFirebase();
      // Filter tasks where the task was created by the current user
      const userTasks = allTasks.filter(
        (task) => task.createdBy && task.createdBy === user.uid
      );
      setTasks(userTasks);
      console.log("✅ Tasks for current user loaded:", userTasks);
    } catch (error) {
      console.error("❌ Error loading tasks:", error);
    }
  };

  const handleMoveTask = (taskId, direction) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          const statusKeys = Object.keys(statusConfig);
          const currentIndex = statusKeys.indexOf(task.status);
          const newIndex = currentIndex + direction;

          if (newIndex >= 0 && newIndex < statusKeys.length) {
            const newStatus = statusKeys[newIndex];

            if (typeof newStatus === "string") {
              updateTaskStatusInFirebase(taskId, newStatus);
              showNotification(`Task moved to ${newStatus.replace("-", " ")}`);
            }

            return { ...task, status: newStatus };
          }
        }
        return task;
      })
    );
  };

  const handleDeleteTask = (taskId) => {
    setTasks((prevTasks) => prevTasks.filter(task => task.id !== taskId));
    showNotification("Task deleted!");
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 2000);
  };

  // Filter & Sort Logic
  const filteredTasks = tasks
    .filter(task => filterCategory === "all" || task.status === filterCategory)
    .filter(task => filterPriority === "all" || task.priority === filterPriority)
    .sort((a, b) => sortOrder === "asc" ? 
      new Date(a.deadline) - new Date(b.deadline) : 
      new Date(b.deadline) - new Date(a.deadline)
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {notification && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-gray-800 text-white rounded-full shadow-lg animate-fade-in flex items-center gap-2">
          <span className="animate-bounce">🎯</span>
          {notification}
        </div>
      )}

      {editTask && (
        <EditTaskModal
          task={editTask}
          users={[]} 
          onSave={(updatedTask) => {
            setTasks(tasks.map(task => (task.id === updatedTask.id ? updatedTask : task)));
            setEditTask(null);
          }}
          onClose={() => setEditTask(null)}
        />
      )}

      <TaskFilters 
        filterCategory={filterCategory} 
        setFilterCategory={setFilterCategory}
        filterPriority={filterPriority} 
        setFilterPriority={setFilterPriority}
        sortOrder={sortOrder} 
        setSortOrder={setSortOrder}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {viewMode === "grid" ? (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 items-start grid-auto-rows-min">
          {Object.entries(statusConfig).map(([statusKey, { label, color }]) => (
            <TaskColumn
              key={statusKey}
              statusKey={statusKey}
              label={label}
              color={color}
              tasks={filteredTasks.filter(task => 
                typeof task.status === "string" && task.status.toLowerCase() === statusKey
              )}
              setEditTask={setEditTask}
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto mt-6 space-y-4">
          {filteredTasks.map(task => (
            <TaskCard 
              key={task.id}
              task={task}
              setEditTask={setEditTask}
              onMoveTask={handleMoveTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
